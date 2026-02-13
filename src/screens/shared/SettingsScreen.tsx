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
import { useTranslation } from 'react-i18next';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { t } = useTranslation();
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

  const bloodGroups = [t('common.select'), 'B+ve', 'AB+ve', 'B-ve', 'O+ve', 'O-ve', 'A+ve', 'A-ve'];

  const handleSave = () => {
    // Handle save
    Alert.alert(t('common.success'), t('more.settings.profileSettingsSaved'));
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleTwoFactorAuth = () => {
    // Navigate to two factor auth
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('more.settings.deleteAccountTitle'),
      t('more.settings.deleteAccountBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('more.settings.delete'), style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.settings.profilePhoto')}</Text>
          <View style={styles.profilePhotoContainer}>
            <View style={styles.profilePhoto}>
              <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton}>
                <Text style={styles.photoButtonText}>{t('common.uploadNew')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButtonRemove}>
                <Text style={styles.photoButtonRemoveText}>{t('common.remove')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.photoHint}>
            {t('more.settings.photoHint')}
          </Text>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.settings.information')}</Text>
          <Input
            label={t('more.settings.firstNameLabel')}
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            placeholder={t('more.settings.firstNamePlaceholder')}
          />
          <Input
            label={t('more.settings.lastNameLabel')}
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            placeholder={t('more.settings.lastNamePlaceholder')}
          />
          <Input
            label={t('more.settings.dateOfBirthLabel')}
            value={formData.dateOfBirth}
            onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
            placeholder={t('more.settings.dateOfBirthPlaceholder')}
          />
          <Input
            label={t('more.settings.phoneNumberLabel')}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder={t('more.settings.phoneNumberPlaceholder')}
            keyboardType="phone-pad"
          />
          <Input
            label={t('more.settings.emailAddressLabel')}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder={t('more.settings.emailPlaceholder')}
            keyboardType="email-address"
          />
          <View style={styles.selectContainer}>
            <Text style={styles.label}>{t('more.settings.bloodGroupLabel')}</Text>
            <TouchableOpacity style={styles.select}>
              <Text style={styles.selectText}>{formData.bloodGroup}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.settings.address')}</Text>
          <Input
            label={t('more.settings.addressLabel')}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder={t('more.settings.addressPlaceholder')}
          />
          <Input
            label={t('more.settings.cityLabel')}
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder={t('more.settings.cityPlaceholder')}
          />
          <Input
            label={t('more.settings.stateLabel')}
            value={formData.state}
            onChangeText={(text) => setFormData({ ...formData, state: text })}
            placeholder={t('more.settings.statePlaceholder')}
          />
          <Input
            label={t('more.settings.countryLabel')}
            value={formData.country}
            onChangeText={(text) => setFormData({ ...formData, country: text })}
            placeholder={t('more.settings.countryPlaceholder')}
          />
          <Input
            label={t('more.settings.pincodeLabel')}
            value={formData.pincode}
            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
            placeholder={t('more.settings.pincodePlaceholder')}
            keyboardType="numeric"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button title={t('common.saveChanges')} onPress={handleSave} style={styles.saveButton} />
          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Text style={styles.actionButtonText}>{t('more.settings.changePassword')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTwoFactorAuth}>
            <Text style={styles.actionButtonText}>{t('more.settings.twoFactorAuth')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>{t('more.settings.deleteAccount')}</Text>
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
