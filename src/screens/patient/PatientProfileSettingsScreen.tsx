import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as profileApi from '../../services/profile';
import * as uploadApi from '../../services/upload';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import { useTranslation } from 'react-i18next';

type PatientProfileSettingsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const defaultAvatar = require('../../../assets/avatar.png');

/**
 * Normalize image URL for mobile app
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.0.114';
  }
  
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

export const PatientProfileSettingsScreen = () => {
  const navigation = useNavigation<PatientProfileSettingsScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    dob: '',
    bloodGroup: '',
    profileImage: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      zip: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
  });

  // Profile image file
  const [profileImageFile, setProfileImageFile] = useState<any>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  // Selected image asset (not uploaded yet)
  const [selectedImageAsset, setSelectedImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Fetch user profile
  const { data: userProfileResponse, isLoading: userProfileLoading } = useQuery({
    queryKey: ['userProfile', user?._id || user?.id],
    queryFn: () => profileApi.getUserProfile(user?._id || user?.id || ''),
    enabled: !!user,
  });

  // Extract user profile data and ensure it's UserProfile type
  const userProfile: profileApi.UserProfile | null = useMemo(() => {
    if (!userProfileResponse) return null;
    // ProfileResponse has structure: { success, message, data: UserProfile | DoctorProfile }
    const response = userProfileResponse as profileApi.ProfileResponse;
    const data = response?.data;
    
    // Type guard: check if it's UserProfile (has email and fullName, not doctor-specific fields like 'title')
    if (data && typeof data === 'object' && 'email' in data && 'fullName' in data && '_id' in data && !('title' in data)) {
      return data as unknown as profileApi.UserProfile;
    }
    return null;
  }, [userProfileResponse]);

  // Populate form when profile loads
  useEffect(() => {
    if (userProfile) {
      const dob = userProfile.dob ? new Date(userProfile.dob).toISOString().split('T')[0] : '';
      
      setFormData({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        gender: userProfile.gender || '',
        dob: dob,
        bloodGroup: userProfile.bloodGroup || '',
        profileImage: userProfile.profileImage || '',
        address: {
          line1: userProfile.address?.line1 || '',
          line2: userProfile.address?.line2 || '',
          city: userProfile.address?.city || '',
          state: userProfile.address?.state || '',
          country: userProfile.address?.country || '',
          zip: userProfile.address?.zip || '',
        },
        emergencyContact: {
          name: userProfile.emergencyContact?.name || '',
          phone: userProfile.emergencyContact?.phone || '',
          relation: userProfile.emergencyContact?.relation || userProfile.emergencyContact?.relationship || '',
        },
      });

      if (userProfile.profileImage) {
        const normalizedUrl = normalizeImageUrl(userProfile.profileImage);
        setProfileImagePreview(normalizedUrl || '');
      }
    }
  }, [userProfile]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?._id || user?.id] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.profileSettings.profileUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || error.message || t('more.profileSettings.failedToUpdateProfile');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Upload profile image function (called on save, not on selection)
  const uploadProfileImage = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    let tempFileUri: string | null = null;
    try {
      // Get MIME type and filename
      const getMimeAndName = (asset: ImagePicker.ImagePickerAsset) => {
        const fileName = asset.fileName || `profile-${Date.now()}.jpg`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mime =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const name = fileName.includes('.') ? fileName : `profile-${Date.now()}.${ext}`;
        return { mime, name };
      };

      const { mime, name } = getMimeAndName(asset);
      tempFileUri = await copyImageToCacheUri(asset.uri, 0, mime);
      const response = await uploadApi.uploadProfileImage({ uri: tempFileUri, mime, name });
      
      const responseData = response?.data || response;
      const relativeUrl = responseData?.url || responseData?.data?.url || response?.url;
      const baseUrl = API_BASE_URL.replace('/api', '');
      const imageUrl = relativeUrl?.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
      
      return imageUrl;
    } finally {
      if (tempFileUri) {
        await deleteCacheFiles([tempFileUri]);
      }
    }
  };

  // Handle profile image change
  const handleImageChange = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('more.profileSettings.permissionRequiredTitle'),
          t('more.profileSettings.permissionPhotosBody')
        );
        return;
      }

      // Show action sheet
      Alert.alert(
        t('more.profileSettings.selectImageTitle'),
        t('more.profileSettings.selectImageBody'),
        [
          {
            text: t('more.profileSettings.camera'),
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [1, 1],
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 4 * 1024 * 1024) {
                  Toast.show({
                    type: 'error',
                    text1: t('more.profileSettings.fileTooLargeTitle'),
                    text2: t('more.profileSettings.imageSizeBelow4mb'),
                  });
                  return;
                }
                // Store asset locally and show preview (don't upload yet)
                setSelectedImageAsset(asset);
                setProfileImagePreview(asset.uri);
              }
            },
          },
          {
            text: t('more.profileSettings.gallery'),
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [1, 1],
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 4 * 1024 * 1024) {
                  Toast.show({
                    type: 'error',
                    text1: t('more.profileSettings.fileTooLargeTitle'),
                    text2: t('more.profileSettings.imageSizeBelow4mb'),
                  });
                  return;
                }
                // Store asset locally and show preview (don't upload yet)
                setSelectedImageAsset(asset);
                setProfileImagePreview(asset.uri);
              }
            },
          },
          { text: t('common.cancel'), style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error.message || t('more.profileSettings.failedToPickImage'),
      });
    }
  };

  // Handle remove image
  const handleRemoveImage = () => {
    setSelectedImageAsset(null);
    setProfileImageFile(null);
    setProfileImagePreview('');
    setFormData((prev) => ({ ...prev, profileImage: '' }));
  };

  // Handle form input change
  const handleChange = (name: string, value: string) => {
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle form submit
  const handleSubmit = () => {
    // Prepare data for API
    const updateData: any = {
      fullName: formData.fullName,
      phone: formData.phone || undefined,
      gender: formData.gender || undefined,
      dob: formData.dob || undefined,
      bloodGroup: formData.bloodGroup || undefined,
      profileImage: formData.profileImage || undefined,
      address: {
        line1: formData.address.line1 || null,
        line2: formData.address.line2 || null,
        city: formData.address.city || null,
        state: formData.address.state || null,
        country: formData.address.country || null,
        zip: formData.address.zip || null,
      },
      emergencyContact: {
        name: formData.emergencyContact.name || null,
        phone: formData.emergencyContact.phone || null,
        relation: formData.emergencyContact.relation || null,
      },
    };

    // Filter out empty strings
    Object.keys(updateData.address).forEach((key) => {
      if (updateData.address[key] === '') {
        updateData.address[key] = null;
      }
    });
    Object.keys(updateData.emergencyContact).forEach((key) => {
      if (updateData.emergencyContact[key] === '') {
        updateData.emergencyContact[key] = null;
      }
    });

    updateProfileMutation.mutate(updateData);
  };

  if (userProfileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.profileSettings.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profileImageSource = profileImagePreview
    ? { uri: profileImagePreview }
    : userProfile && userProfile.profileImage
    ? { uri: normalizeImageUrl(userProfile.profileImage) || '' }
    : defaultAvatar;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          <Text style={styles.sectionTitle}>{t('more.settings.profilePhoto')}</Text>
          <View style={styles.profilePhotoContainer}>
            <Image source={profileImageSource} style={styles.profileImage} defaultSource={defaultAvatar} />
            <View style={styles.profilePhotoActions}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleImageChange}
                disabled={updateProfileMutation.isPending}
              >
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <Text style={styles.uploadButtonText}>
                  {selectedImageAsset
                    ? t('more.profileSettings.changeImage')
                    : t('more.profileSettings.selectImage')}
                </Text>
              </TouchableOpacity>
              {profileImagePreview && (
                <TouchableOpacity style={styles.removeButton} onPress={handleRemoveImage}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={styles.removeButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.imageHint}>{t('more.settings.photoHint')}</Text>
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.settings.information')}</Text>
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.fullNameLabel')}
              placeholder={t('more.profileSettings.fullNamePlaceholder')}
              value={formData.fullName}
              onChangeText={(text) => handleChange('fullName', text)}
              containerStyle={styles.input}
            />
          </View>
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.dateOfBirthLabel')}
              placeholder={t('more.profileSettings.dateOfBirthPlaceholder')}
              value={formData.dob}
              onChangeText={(text) => handleChange('dob', text)}
              containerStyle={styles.inputHalf}
            />
            <View style={styles.inputSpacer} />
            <View style={styles.selectContainer}>
              <Text style={styles.inputLabel}>{t('more.profileSettings.genderLabel')}</Text>
              <TouchableOpacity
                style={styles.pickerWrapper}
                onPress={() => setShowGenderPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, !formData.gender && styles.pickerPlaceholder]}>
                  {formData.gender
                    ? t(`more.profileSettings.gender.${formData.gender.toLowerCase()}`)
                    : t('more.profileSettings.selectGenderPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.phoneNumberLabel')}
              placeholder={t('more.profileSettings.phoneNumberPlaceholder')}
              value={formData.phone}
              onChangeText={(text) => handleChange('phone', text)}
              keyboardType="phone-pad"
              containerStyle={styles.inputHalf}
            />
            <View style={styles.inputSpacer} />
              <Input
                label={t('more.profileSettings.emailAddressLabel')}
                placeholder={t('more.profileSettings.emailPlaceholder')}
                value={userProfile ? userProfile.email || '' : ''}
                editable={false}
                containerStyle={styles.inputHalfDisabled}
              />
          </View>
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.bloodGroupLabel')}
              placeholder={t('more.profileSettings.bloodGroupPlaceholder')}
              value={formData.bloodGroup}
              onChangeText={(text) => handleChange('bloodGroup', text)}
              containerStyle={styles.input}
            />
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.settings.address')}</Text>
          <Input
            label={t('more.profileSettings.addressLine1Label')}
            placeholder={t('more.profileSettings.addressLine1Placeholder')}
            value={formData.address.line1}
            onChangeText={(text) => handleChange('address.line1', text)}
            style={styles.input}
          />
          <Input
            label={t('more.profileSettings.addressLine2Label')}
            placeholder={t('more.profileSettings.addressLine2Placeholder')}
            value={formData.address.line2}
            onChangeText={(text) => handleChange('address.line2', text)}
            style={styles.input}
          />
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.cityLabel')}
              placeholder={t('more.profileSettings.cityPlaceholder')}
              value={formData.address.city}
              onChangeText={(text) => handleChange('address.city', text)}
              containerStyle={styles.inputHalf}
            />
            <View style={styles.inputSpacer} />
            <Input
              label={t('more.profileSettings.stateLabel')}
              placeholder={t('more.profileSettings.statePlaceholder')}
              value={formData.address.state}
              onChangeText={(text) => handleChange('address.state', text)}
              containerStyle={styles.inputHalf}
            />
          </View>
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.countryLabel')}
              placeholder={t('more.profileSettings.countryPlaceholder')}
              value={formData.address.country}
              onChangeText={(text) => handleChange('address.country', text)}
              containerStyle={styles.inputHalf}
            />
            <View style={styles.inputSpacer} />
            <Input
              label={t('more.profileSettings.zipCodeLabel')}
              placeholder={t('more.profileSettings.zipCodePlaceholder')}
              value={formData.address.zip}
              onChangeText={(text) => handleChange('address.zip', text)}
              keyboardType="numeric"
              containerStyle={styles.inputHalf}
            />
          </View>
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.profileSettings.emergencyContactTitle')}</Text>
          <Input
            label={t('more.profileSettings.emergencyNameLabel')}
            placeholder={t('more.profileSettings.emergencyNamePlaceholder')}
            value={formData.emergencyContact.name}
            onChangeText={(text) => handleChange('emergencyContact.name', text)}
            style={styles.input}
          />
          <View style={styles.formRow}>
            <Input
              label={t('more.profileSettings.emergencyPhoneLabel')}
              placeholder={t('more.profileSettings.emergencyPhonePlaceholder')}
              value={formData.emergencyContact.phone}
              onChangeText={(text) => handleChange('emergencyContact.phone', text)}
              keyboardType="phone-pad"
              containerStyle={styles.inputHalf}
            />
            <View style={styles.inputSpacer} />
            <Input
              label={t('more.profileSettings.emergencyRelationLabel')}
              placeholder={t('more.profileSettings.emergencyRelationPlaceholder')}
              value={formData.emergencyContact.relation}
              onChangeText={(text) => handleChange('emergencyContact.relation', text)}
              containerStyle={styles.inputHalf}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={t('common.cancel')}
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
            variant="secondary"
          />
          <Button
            title={updateProfileMutation.isPending ? t('common.saving') : t('common.saveChanges')}
            onPress={handleSubmit}
            style={styles.saveButton}
            disabled={updateProfileMutation.isPending}
          />
        </View>
      </ScrollView>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t('more.profileSettings.genderModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerOptions}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.pickerOption,
                    formData.gender === gender && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    handleChange('gender', gender);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.gender === gender && styles.pickerOptionTextActive,
                    ]}
                  >
                    {t(`more.profileSettings.gender.${gender.toLowerCase()}`)}
                  </Text>
                  {formData.gender === gender && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  profilePhotoSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profilePhotoContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profilePhotoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight || colors.backgroundLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  imageHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputSpacer: {
    width: 12,
  },
  disabledInput: {
    opacity: 0.6,
  },
  inputHalf: {
    marginBottom: 16,
    flex: 1,
  },
  inputHalfDisabled: {
    marginBottom: 16,
    flex: 1,
    opacity: 0.6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  selectContainer: {
    flex: 1,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  pickerOptions: {
    padding: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: colors.text,
  },
  saveButton: {
    flex: 1,
  },
});

