import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MoreStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

type PharmacyProfileScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const PharmacyProfileScreen = () => {
  const navigation = useNavigation<PharmacyProfileScreenNavigationProp>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'about' | 'password'>('about');
  const [profileImage, setProfileImage] = useState<any>(require('../../../assets/avatar.png'));
  const [loading, setLoading] = useState(false);

  const [personalDetails, setPersonalDetails] = useState({
    name: user?.name || 'Ryan Taylor',
    email: user?.email || 'ryantaylor@admin.com',
    dateOfBirth: '24 Jul 1983',
    phone: '+1 305-310-5857',
    address: '4663 Agriculture Lane',
    city: 'Miami',
    state: 'Florida',
    country: 'United States',
    zipCode: '33165',
    about: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const pickImage = async () => {
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
        setProfileImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSavePersonalDetails = () => {
    setLoading(true);
    // TODO: Save personal details via API
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Personal details updated successfully');
    }, 2000);
  };

  const handleChangePassword = () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Required', 'Please fill all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    // TODO: Change password via API
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Password changed successfully');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
          <Image source={profileImage} style={styles.profileImage} />
          <View style={styles.editImageButton}>
            <Ionicons name="camera" size={16} color={colors.textWhite} />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{personalDetails.name}</Text>
          <Text style={styles.profileEmail}>{personalDetails.email}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {personalDetails.city}, {personalDetails.state}
            </Text>
          </View>
          <Text style={styles.aboutText} numberOfLines={2}>
            {personalDetails.about}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'about' && styles.tabActive]}
          onPress={() => setActiveTab('about')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
            About
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
            Password
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'about' ? (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
              </View>

              <Input
                label="Name"
                value={personalDetails.name}
                onChangeText={(text) => setPersonalDetails({ ...personalDetails, name: text })}
                placeholder="Enter name"
              />
              <Input
                label="Date of Birth"
                value={personalDetails.dateOfBirth}
                onChangeText={(text) =>
                  setPersonalDetails({ ...personalDetails, dateOfBirth: text })
                }
                placeholder="DD MMM YYYY"
              />
              <Input
                label="Email ID"
                value={personalDetails.email}
                onChangeText={(text) => setPersonalDetails({ ...personalDetails, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
              />
              <Input
                label="Mobile"
                value={personalDetails.phone}
                onChangeText={(text) => setPersonalDetails({ ...personalDetails, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
              <Input
                label="Address"
                value={personalDetails.address}
                onChangeText={(text) => setPersonalDetails({ ...personalDetails, address: text })}
                placeholder="Enter address"
                multiline
              />
              <View style={styles.row}>
                <Input
                  label="City"
                  value={personalDetails.city}
                  onChangeText={(text) => setPersonalDetails({ ...personalDetails, city: text })}
                  placeholder="Enter city"
                  style={styles.halfInput}
                />
                <Input
                  label="State"
                  value={personalDetails.state}
                  onChangeText={(text) => setPersonalDetails({ ...personalDetails, state: text })}
                  placeholder="Enter state"
                  style={styles.halfInput}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label="Zip Code"
                  value={personalDetails.zipCode}
                  onChangeText={(text) =>
                    setPersonalDetails({ ...personalDetails, zipCode: text })
                  }
                  placeholder="Enter zip code"
                  style={styles.halfInput}
                />
                <Input
                  label="Country"
                  value={personalDetails.country}
                  onChangeText={(text) =>
                    setPersonalDetails({ ...personalDetails, country: text })
                  }
                  placeholder="Enter country"
                  style={styles.halfInput}
                />
              </View>

              <Button
                title="Save Changes"
                onPress={handleSavePersonalDetails}
                loading={loading}
                style={styles.saveButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Password</Text>

              <Input
                label="Old Password"
                value={passwordData.oldPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, oldPassword: text })}
                placeholder="Enter old password"
                secureTextEntry
              />
              <Input
                label="New Password"
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                placeholder="Enter new password"
                secureTextEntry
              />
              <Input
                label="Confirm Password"
                value={passwordData.confirmPassword}
                onChangeText={(text) =>
                  setPasswordData({ ...passwordData, confirmPassword: text })
                }
                placeholder="Confirm new password"
                secureTextEntry
              />

              <Button
                title="Save Changes"
                onPress={handleChangePassword}
                loading={loading}
                style={styles.saveButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
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

