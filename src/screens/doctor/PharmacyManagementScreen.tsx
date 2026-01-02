import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacyApi from '../../services/pharmacy';
import Toast from 'react-native-toast-message';

type PharmacyManagementScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const PharmacyManagementScreen = () => {
  const navigation = useNavigation<PharmacyManagementScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user ID
  const userId = user?._id || user?.id;

  // Fetch doctor's pharmacy (if exists)
  const { data: doctorPharmacyResponse, isLoading, refetch: refetchPharmacy } = useQuery({
    queryKey: ['doctor-pharmacy', userId],
    queryFn: () => pharmacyApi.listPharmacies({ ownerId: userId!, limit: 1 }),
    enabled: !!userId,
  });

  const doctorPharmacy = useMemo(() => {
    if (!doctorPharmacyResponse) return null;
    const responseData = doctorPharmacyResponse.data || doctorPharmacyResponse;
    const pharmacies = Array.isArray(responseData) ? responseData : (responseData.pharmacies || []);
    return pharmacies.length > 0 ? pharmacies[0] : null;
  }, [doctorPharmacyResponse]);

  const [pharmacyFormData, setPharmacyFormData] = useState({
    name: doctorPharmacy?.name || '',
    phone: doctorPharmacy?.phone || '',
    address: {
      line1: doctorPharmacy?.address?.line1 || '',
      line2: doctorPharmacy?.address?.line2 || '',
      city: doctorPharmacy?.address?.city || '',
      state: doctorPharmacy?.address?.state || '',
      country: doctorPharmacy?.address?.country || '',
      zip: doctorPharmacy?.address?.zip || '',
    },
    location: {
      lat: doctorPharmacy?.location?.lat?.toString() || '',
      lng: doctorPharmacy?.location?.lng?.toString() || '',
    },
  });

  // Update form data when pharmacy is loaded
  React.useEffect(() => {
    if (doctorPharmacy) {
      setPharmacyFormData({
        name: doctorPharmacy.name || '',
        phone: doctorPharmacy.phone || '',
        address: {
          line1: doctorPharmacy.address?.line1 || '',
          line2: doctorPharmacy.address?.line2 || '',
          city: doctorPharmacy.address?.city || '',
          state: doctorPharmacy.address?.state || '',
          country: doctorPharmacy.address?.country || '',
          zip: doctorPharmacy.address?.zip || '',
        },
        location: {
          lat: doctorPharmacy.location?.lat?.toString() || '',
          lng: doctorPharmacy.location?.lng?.toString() || '',
        },
      });
    }
  }, [doctorPharmacy]);

  // Create pharmacy mutation
  const createPharmacyMutation = useMutation({
    mutationFn: (data: pharmacyApi.CreatePharmacyData) => pharmacyApi.createPharmacy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-products'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Pharmacy created successfully!',
      });
      refetchPharmacy();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create pharmacy';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Update pharmacy mutation
  const updatePharmacyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<pharmacyApi.CreatePharmacyData> }) =>
      pharmacyApi.updatePharmacy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-products'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Pharmacy updated successfully!',
      });
      refetchPharmacy();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update pharmacy';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  const handleSubmit = async () => {
    if (!pharmacyFormData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter pharmacy name',
      });
      return;
    }

    // Clean up the data - only include fields that have values
    const cleanedData: pharmacyApi.CreatePharmacyData = {
      name: pharmacyFormData.name.trim(),
    };

    if (pharmacyFormData.phone && pharmacyFormData.phone.trim()) {
      cleanedData.phone = pharmacyFormData.phone.trim();
    }

    // Clean address - only include non-empty fields
    const addressFields: any = {};
    if (pharmacyFormData.address.line1?.trim()) addressFields.line1 = pharmacyFormData.address.line1.trim();
    if (pharmacyFormData.address.line2?.trim()) addressFields.line2 = pharmacyFormData.address.line2.trim();
    if (pharmacyFormData.address.city?.trim()) addressFields.city = pharmacyFormData.address.city.trim();
    if (pharmacyFormData.address.state?.trim()) addressFields.state = pharmacyFormData.address.state.trim();
    if (pharmacyFormData.address.country?.trim()) addressFields.country = pharmacyFormData.address.country.trim();
    if (pharmacyFormData.address.zip?.trim()) addressFields.zip = pharmacyFormData.address.zip.trim();

    if (Object.keys(addressFields).length > 0) {
      cleanedData.address = addressFields;
    }

    // Clean location - only include if both lat and lng are valid numbers
    if (pharmacyFormData.location.lat && pharmacyFormData.location.lng) {
      const lat = parseFloat(pharmacyFormData.location.lat);
      const lng = parseFloat(pharmacyFormData.location.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        cleanedData.location = { lat, lng };
      }
    }

    if (doctorPharmacy) {
      // Update existing pharmacy
      updatePharmacyMutation.mutate({ id: doctorPharmacy._id, data: cleanedData });
    } else {
      // Create new pharmacy
      createPharmacyMutation.mutate(cleanedData);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pharmacy information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="business-outline" size={32} color={colors.primary} />
            <Text style={styles.headerTitle}>
              {doctorPharmacy ? 'Manage Your Pharmacy' : 'Create Your Pharmacy'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {doctorPharmacy
                ? 'Update your pharmacy information below'
                : 'You need to create a pharmacy before adding products. All your products will be automatically linked to this pharmacy.'}
            </Text>
          </View>
        </View>

        {doctorPharmacy && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Your pharmacy is active. You can update the information below.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Pharmacy Name *"
            placeholder="Enter pharmacy name"
            value={pharmacyFormData.name}
            onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, name: text })}
          />

          <Input
            label="Phone"
            placeholder="Enter phone number (optional)"
            value={pharmacyFormData.phone}
            onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, phone: text })}
            keyboardType="phone-pad"
          />

          <Input
            label="Address Line 1"
            placeholder="Street address (optional)"
            value={pharmacyFormData.address.line1}
            onChangeText={(text) =>
              setPharmacyFormData({
                ...pharmacyFormData,
                address: { ...pharmacyFormData.address, line1: text },
              })
            }
          />

          <Input
            label="Address Line 2"
            placeholder="Apartment, suite, etc. (optional)"
            value={pharmacyFormData.address.line2}
            onChangeText={(text) =>
              setPharmacyFormData({
                ...pharmacyFormData,
                address: { ...pharmacyFormData.address, line2: text },
              })
            }
          />

          <View style={styles.row}>
            <Input
              label="City"
              placeholder="City (optional)"
              value={pharmacyFormData.address.city}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  address: { ...pharmacyFormData.address, city: text },
                })
              }
              style={styles.halfInput}
            />
            <Input
              label="State"
              placeholder="State (optional)"
              value={pharmacyFormData.address.state}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  address: { ...pharmacyFormData.address, state: text },
                })
              }
              style={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Country"
              placeholder="Country (optional)"
              value={pharmacyFormData.address.country}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  address: { ...pharmacyFormData.address, country: text },
                })
              }
              style={styles.halfInput}
            />
            <Input
              label="ZIP Code"
              placeholder="ZIP code (optional)"
              value={pharmacyFormData.address.zip}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  address: { ...pharmacyFormData.address, zip: text },
                })
              }
              style={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Latitude"
              placeholder="Latitude (optional)"
              value={pharmacyFormData.location.lat}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  location: { ...pharmacyFormData.location, lat: text },
                })
              }
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
            <Input
              label="Longitude"
              placeholder="Longitude (optional)"
              value={pharmacyFormData.location.lng}
              onChangeText={(text) =>
                setPharmacyFormData({
                  ...pharmacyFormData,
                  location: { ...pharmacyFormData.location, lng: text },
                })
              }
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={
            doctorPharmacy
              ? updatePharmacyMutation.isPending
                ? 'Updating...'
                : 'Update Pharmacy'
              : createPharmacyMutation.isPending
              ? 'Creating...'
              : 'Create Pharmacy'
          }
          onPress={handleSubmit}
          loading={createPharmacyMutation.isPending || updatePharmacyMutation.isPending}
        />
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.background,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

