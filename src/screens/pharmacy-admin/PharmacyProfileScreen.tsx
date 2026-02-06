import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { MoreStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacyApi from '../../services/pharmacy';
import * as uploadApi from '../../services/upload';
import { API_BASE_URL } from '../../config/api';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import Toast from 'react-native-toast-message';

type PharmacyProfileScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const PharmacyProfileScreen = () => {
  const navigation = useNavigation<PharmacyProfileScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyUser = isPharmacy || isParapharmacy;
  const userId = user?._id || user?.id;

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: myPharmacyResponse, isLoading: pharmacyLoading, refetch: refetchMyPharmacy } = useQuery({
    queryKey: ['my-pharmacy', userId],
    queryFn: () => pharmacyApi.getMyPharmacy(),
    enabled: !!userId && isPharmacyUser,
    retry: 1,
  });

  const pharmacy = myPharmacyResponse?.data;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    zip: '',
    lat: '',
    lng: '',
  });

  useEffect(() => {
    if (!pharmacy) return;
    setForm({
      name: pharmacy.name || '',
      phone: pharmacy.phone || '',
      addressLine1: pharmacy.address?.line1 || '',
      addressLine2: pharmacy.address?.line2 || '',
      city: pharmacy.address?.city || '',
      state: pharmacy.address?.state || '',
      country: pharmacy.address?.country || '',
      zip: pharmacy.address?.zip || '',
      lat: pharmacy.location?.lat !== undefined && pharmacy.location?.lat !== null ? String(pharmacy.location.lat) : '',
      lng: pharmacy.location?.lng !== undefined && pharmacy.location?.lng !== null ? String(pharmacy.location.lng) : '',
    });
    setLogoUri(pharmacy.logo || null);
  }, [pharmacy]);

  const normalizedLogoUrl = useMemo(() => {
    if (!logoUri || typeof logoUri !== 'string') return null;
    const trimmed = logoUri.trim();
    if (!trimmed) return null;
    const apiBase = API_BASE_URL || '';
    const baseUrl = apiBase ? apiBase.replace('/api', '') : 'http://localhost:5000';
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    const deviceHost = match ? match[1] : '192.168.0.114';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      let normalized = trimmed;
      if (normalized.includes('localhost')) normalized = normalized.replace('localhost', deviceHost);
      if (normalized.includes('127.0.0.1')) normalized = normalized.replace('127.0.0.1', deviceHost);
      return normalized;
    }
    const imagePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseUrl}${imagePath}`;
  }, [logoUri]);

  const logoForSave = useMemo(() => {
    if (!logoUri || typeof logoUri !== 'string') return undefined;
    const trimmed = logoUri.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return normalizedLogoUrl || undefined;
  }, [logoUri, normalizedLogoUrl]);

  const createPharmacyMutation = useMutation({
    mutationFn: (data: pharmacyApi.CreatePharmacyData) => pharmacyApi.createPharmacy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy'] });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Pharmacy created successfully' });
      refetchMyPharmacy();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save pharmacy';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMessage });
    },
  });

  const updatePharmacyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<pharmacyApi.CreatePharmacyData> }) =>
      pharmacyApi.updatePharmacy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy'] });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Pharmacy updated successfully' });
      refetchMyPharmacy();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save pharmacy';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMessage });
    },
  });

  const pickImage = async () => {
    if (!isPharmacyUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName?.trim() || `pharmacy-logo-${Date.now()}.jpg`;
        const mime = fileName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : fileName.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';

        let tempFileUris: string[] = [];

        try {
          setLoading(true);
          const fileUri = await copyImageToCacheUri(asset.uri, 0, mime);
          tempFileUris.push(fileUri);

          const uploadResult = await uploadApi.uploadPharmacyLogo({
            uri: fileUri,
            mime,
            name: fileName,
          });
          const url = uploadResult?.data?.url || uploadResult?.url;

          if (!url) {
            throw new Error('Upload succeeded but no URL returned');
          }

          setLogoUri(url);

          if (pharmacy?._id) {
            updatePharmacyMutation.mutate({ id: pharmacy._id, data: { logo: logoForSave || url } as any });
          }
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'Failed to upload logo');
        } finally {
          setLoading(false);
          if (tempFileUris.length > 0) {
            deleteCacheFiles(tempFileUris).catch(() => {});
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!isPharmacyUser) return;
    if (!form.name.trim()) {
      Alert.alert('Required', 'Pharmacy name is required');
      return;
    }

    const data: pharmacyApi.CreatePharmacyData = {
      name: form.name.trim(),
    };

    if (form.phone.trim()) data.phone = form.phone.trim();

    const address: any = {};
    if (form.addressLine1.trim()) address.line1 = form.addressLine1.trim();
    if (form.addressLine2.trim()) address.line2 = form.addressLine2.trim();
    if (form.city.trim()) address.city = form.city.trim();
    if (form.state.trim()) address.state = form.state.trim();
    if (form.country.trim()) address.country = form.country.trim();
    if (form.zip.trim()) address.zip = form.zip.trim();
    if (Object.keys(address).length > 0) data.address = address;

    const lat = form.lat.trim() ? parseFloat(form.lat.trim()) : null;
    const lng = form.lng.trim() ? parseFloat(form.lng.trim()) : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      data.location = { lat, lng };
    }

    if (logoUri) {
      (data as any).logo = logoForSave || logoUri;
    }

    if (pharmacy?._id) {
      updatePharmacyMutation.mutate({ id: pharmacy._id, data: data as any });
    } else {
      createPharmacyMutation.mutate(data);
    }
  };

  if (!isPharmacyUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>This section is available for pharmacy accounts only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pharmacyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
          <Image
            source={normalizedLogoUrl ? { uri: normalizedLogoUrl } : require('../../../assets/avatar.png')}
            style={styles.profileImage}
            defaultSource={require('../../../assets/avatar.png')}
          />
          <View style={styles.editImageButton}>
            <Ionicons name="camera" size={16} color={colors.textWhite} />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{form.name || pharmacy?.name || 'Pharmacy'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {form.city || pharmacy?.address?.city || 'N/A'}{form.state || pharmacy?.address?.state ? `, ${form.state || pharmacy?.address?.state}` : ''}
            </Text>
          </View>
          {!!logoUri && <Text style={styles.aboutText} numberOfLines={2}>{logoUri}</Text>}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.tabContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pharmacy Details</Text>
            </View>

            <Input
              label="Pharmacy Name"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Enter pharmacy name"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Address Line 1"
              value={form.addressLine1}
              onChangeText={(text) => setForm({ ...form, addressLine1: text })}
              placeholder="Street address"
            />
            <Input
              label="Address Line 2"
              value={form.addressLine2}
              onChangeText={(text) => setForm({ ...form, addressLine2: text })}
              placeholder="Apartment, suite, etc."
            />
            <View style={styles.row}>
              <Input
                label="City"
                value={form.city}
                onChangeText={(text) => setForm({ ...form, city: text })}
                placeholder="City"
                style={styles.halfInput}
              />
              <Input
                label="State"
                value={form.state}
                onChangeText={(text) => setForm({ ...form, state: text })}
                placeholder="State"
                style={styles.halfInput}
              />
            </View>
            <View style={styles.row}>
              <Input
                label="Zip Code"
                value={form.zip}
                onChangeText={(text) => setForm({ ...form, zip: text })}
                placeholder="Zip"
                style={styles.halfInput}
              />
              <Input
                label="Country"
                value={form.country}
                onChangeText={(text) => setForm({ ...form, country: text })}
                placeholder="Country"
                style={styles.halfInput}
              />
            </View>
            <View style={styles.row}>
              <Input
                label="Latitude"
                value={form.lat}
                onChangeText={(text) => setForm({ ...form, lat: text })}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                style={styles.halfInput}
              />
              <Input
                label="Longitude"
                value={form.lng}
                onChangeText={(text) => setForm({ ...form, lng: text })}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                style={styles.halfInput}
              />
            </View>

            <Button
              title={loading || createPharmacyMutation.isPending || updatePharmacyMutation.isPending ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              loading={loading || createPharmacyMutation.isPending || updatePharmacyMutation.isPending}
              style={styles.saveButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  profileHeader: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 12,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 12,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  aboutText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 16,
  },
});

