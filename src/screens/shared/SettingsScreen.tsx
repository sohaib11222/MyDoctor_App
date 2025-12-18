import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [formData, setFormData] = useState({
    firstName: 'Adrian',
    lastName: 'Marshall',
    dateOfBirth: '15/01/1982',
    phone: '+1 234 567 8900',
    email: 'adrian.marshall@example.com',
    bloodGroup: 'AB+ve',
    address: '123 Main Street',
    city: 'New York',
    state: 'New York',
    country: 'United States',
    pincode: '10001',
  });

  const bloodGroups = ['Select', 'B+ve', 'AB+ve', 'B-ve', 'O+ve', 'O-ve', 'A+ve', 'A-ve'];

  const handleSave = () => {
    // Handle save
    Alert.alert('Success', 'Profile settings saved successfully');
  };

  const handleChangePassword = () => {
    // Navigate to change password
  };

  const handleTwoFactorAuth = () => {
    // Navigate to two factor auth
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <View style={styles.profilePhotoContainer}>
            <View style={styles.profilePhoto}>
              <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton}>
                <Text style={styles.photoButtonText}>Upload New</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButtonRemove}>
                <Text style={styles.photoButtonRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.photoHint}>
            Your Image should Below 4 MB, Accepted format jpg,png,svg
          </Text>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <Input
            label="First Name *"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            placeholder="Enter first name"
          />
          <Input
            label="Last Name *"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            placeholder="Enter last name"
          />
          <Input
            label="Date of Birth *"
            value={formData.dateOfBirth}
            onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
            placeholder="dd/mm/yyyy"
          />
          <Input
            label="Phone Number *"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <Input
            label="Email Address *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
          />
          <View style={styles.selectContainer}>
            <Text style={styles.label}>Blood Group *</Text>
            <TouchableOpacity style={styles.select}>
              <Text style={styles.selectText}>{formData.bloodGroup}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Input
            label="Address *"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
          />
          <Input
            label="City *"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="Enter city"
          />
          <Input
            label="State *"
            value={formData.state}
            onChangeText={(text) => setFormData({ ...formData, state: text })}
            placeholder="Enter state"
          />
          <Input
            label="Country *"
            value={formData.country}
            onChangeText={(text) => setFormData({ ...formData, country: text })}
            placeholder="Enter country"
          />
          <Input
            label="Pincode *"
            value={formData.pincode}
            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
            placeholder="Enter pincode"
            keyboardType="numeric"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button title="Save Changes" onPress={handleSave} style={styles.saveButton} />
          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTwoFactorAuth}>
            <Text style={styles.actionButtonText}>2 Factor Authentication</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
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
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  profilePhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoActions: {
    flex: 1,
  },
  photoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  photoButtonRemove: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoButtonRemoveText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  photoHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  select: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
  },
  actionsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  deleteButton: {
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
});
