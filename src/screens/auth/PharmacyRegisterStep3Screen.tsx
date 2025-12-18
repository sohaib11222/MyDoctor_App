import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PharmacyRegisterStep3ScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

interface FileState {
  uri: string;
  name: string;
}

const years = ['Select year', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const PharmacyRegisterStep3Screen = () => {
  const navigation = useNavigation<PharmacyRegisterStep3ScreenNavigationProp>();
  const { updateUser } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [yearsRegistered, setYearsRegistered] = useState(years[0]);
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [rightToSellCert, setRightToSellCert] = useState<FileState | null>(null);
  const [photoId, setPhotoId] = useState<FileState | null>(null);
  const [clinicalEmployment, setClinicalEmployment] = useState<FileState | null>(null);
  const [doDeliver, setDoDeliver] = useState(false);
  const [offerAppointment, setOfferAppointment] = useState(false);
  const [honourFreePrescription, setHonourFreePrescription] = useState(false);
  const [yearsMenuVisible, setYearsMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickDocument = async (setFile: (file: FileState) => void, type: 'image' | 'document') => {
    try {
      if (type === 'image') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setFile({
            uri: result.assets[0].uri,
            name: result.assets[0].uri.split('/').pop() || 'image.jpg',
          });
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets[0]) {
          setFile({
            uri: result.assets[0].uri,
            name: result.assets[0].name,
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleSubmit = async () => {
    if (!address1.trim()) {
      Alert.alert('Required', 'Address line 1 is required.');
      return;
    }
    if (!postalCode.trim()) {
      Alert.alert('Required', 'Postal/Zip code is required.');
      return;
    }
    if (!rightToSellCert || !photoId || !clinicalEmployment) {
      Alert.alert('Required', 'Please upload all required certificates.');
      return;
    }
    
    setLoading(true);
    try {
      // TODO: Submit to backend with all registration data
      
      // Retrieve pending pharmacy registration data
      const pendingData = await AsyncStorage.getItem('pending_pharmacy_registration');
      if (pendingData) {
        const pharmacyUser = JSON.parse(pendingData);
        
        // Complete the registration by setting the user
        const mockToken = `mock_token_${Date.now()}`;
        const completeUser = {
          ...pharmacyUser,
          token: mockToken,
          registrationComplete: true,
        };
        
        // Store and set user to log them in
        await AsyncStorage.multiSet([
          ['user', JSON.stringify(pharmacyUser)],
          ['token', mockToken],
        ]);
        
        // Remove pending registration
        await AsyncStorage.removeItem('pending_pharmacy_registration');
        
        // Update user context to log them in
        updateUser(completeUser as any);
        
        Alert.alert('Success', 'Registration completed successfully!');
        // Navigation will happen automatically via AppNavigator when user is set
      } else {
        Alert.alert('Error', 'Registration data not found. Please start over.');
        navigation.navigate('PharmacyRegister');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
      console.error('Registration completion error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Ionicons name="medical" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepCompleted]}>
            <Ionicons name="checkmark" size={20} color={colors.textWhite} />
          </View>
          <View style={styles.stepLineCompleted} />
          <View style={[styles.step, styles.stepCompleted]}>
            <Ionicons name="checkmark" size={20} color={colors.textWhite} />
          </View>
          <View style={styles.stepLineCompleted} />
          <View style={[styles.step, styles.stepActive]}>
            <Text style={styles.stepTextActive}>3</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Registered Checkbox */}
          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Are you Registered?</Text>
            <Switch
              value={isRegistered}
              onValueChange={setIsRegistered}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isRegistered ? colors.primary : colors.textLight}
            />
          </View>

          {/* Years Registered (if registered) */}
          {isRegistered && (
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>How Many Years you have been Registered?</Text>
              <Menu
                visible={yearsMenuVisible}
                onDismiss={() => setYearsMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() => setYearsMenuVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, yearsRegistered === years[0] && styles.pickerPlaceholder]}>
                      {yearsRegistered}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                }
              >
                {years.slice(1).map((year, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setYearsRegistered(year);
                      setYearsMenuVisible(false);
                    }}
                    title={year}
                  />
                ))}
              </Menu>
            </View>
          )}

          {/* Address Fields */}
          <Input
            label="Address line 1"
            placeholder="Enter address line 1"
            value={address1}
            onChangeText={setAddress1}
          />

          <Input
            label="Address line 2"
            placeholder="Enter address line 2 (optional)"
            value={address2}
            onChangeText={setAddress2}
          />

          <Input
            label="Postal/Zip code"
            placeholder="Enter postal/zip code"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />

          {/* Certifications */}
          <Text style={styles.sectionTitle}>Certification and Employer</Text>

          <View style={styles.uploadGrid}>
            <TouchableOpacity
              style={styles.uploadCard}
              onPress={() => pickDocument(setRightToSellCert, 'document')}
              activeOpacity={0.7}
            >
              {rightToSellCert ? (
                <View style={styles.uploadedFile}>
                  <Ionicons name="document-text" size={32} color={colors.primary} />
                  <Text style={styles.uploadedFileName} numberOfLines={1}>
                    {rightToSellCert.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setRightToSellCert(null)}
                    style={styles.removeFileButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                  <Text style={styles.uploadCardText}>Upload Right To sell Certificate</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadCard}
              onPress={() => pickDocument(setPhotoId, 'image')}
              activeOpacity={0.7}
            >
              {photoId ? (
                <View style={styles.uploadedFile}>
                  <Ionicons name="image" size={32} color={colors.primary} />
                  <Text style={styles.uploadedFileName} numberOfLines={1}>
                    {photoId.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPhotoId(null)}
                    style={styles.removeFileButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                  <Text style={styles.uploadCardText}>Upload Photo ID</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadCard}
              onPress={() => pickDocument(setClinicalEmployment, 'document')}
              activeOpacity={0.7}
            >
              {clinicalEmployment ? (
                <View style={styles.uploadedFile}>
                  <Ionicons name="document-text" size={32} color={colors.primary} />
                  <Text style={styles.uploadedFileName} numberOfLines={1}>
                    {clinicalEmployment.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setClinicalEmployment(null)}
                    style={styles.removeFileButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                  <Text style={styles.uploadCardText}>Upload Clinical employment</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Checkboxes */}
          <View style={styles.checkboxesSection}>
            <View style={styles.checkboxRow}>
              <Text style={styles.checkboxLabel}>Do you Deliver?</Text>
              <Switch
                value={doDeliver}
                onValueChange={setDoDeliver}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={doDeliver ? colors.primary : colors.textLight}
              />
            </View>

            <View style={styles.checkboxRow}>
              <Text style={styles.checkboxLabel}>Do you Offer appointment?</Text>
              <Switch
                value={offerAppointment}
                onValueChange={setOfferAppointment}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={offerAppointment ? colors.primary : colors.textLight}
              />
            </View>

            <View style={styles.checkboxRow}>
              <Text style={styles.checkboxLabel}>Do you honour free prescription?</Text>
              <Switch
                value={honourFreePrescription}
                onValueChange={setHonourFreePrescription}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={honourFreePrescription ? colors.primary : colors.textLight}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Button title="Continue" onPress={handleSubmit} loading={loading} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    width: 40,
    height: 2,
    backgroundColor: colors.success,
    marginHorizontal: 8,
  },
  formContainer: {
    flex: 1,
    gap: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 16,
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  uploadCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  uploadedFile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  uploadedFileName: {
    fontSize: 11,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  removeFileButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  checkboxesSection: {
    marginTop: 8,
    gap: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

