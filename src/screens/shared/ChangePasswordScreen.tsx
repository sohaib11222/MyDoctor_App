import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { MoreStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as authApi from '../../services/auth';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type ChangePasswordScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const ChangePasswordScreen = () => {
  const navigation = useNavigation<ChangePasswordScreenNavigationProp>();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: (response) => {
      const message =
        response?.data?.message || response?.message || t('more.changePassword.successFallback');
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: message,
      });
      // Reset form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.changePassword.errorFailedToChange');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.oldPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.required'),
        text2: t('more.changePassword.requiredCurrentPassword'),
      });
      return;
    }

    if (!formData.newPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.required'),
        text2: t('more.changePassword.requiredNewPassword'),
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: t('more.changePassword.invalidPasswordTitle'),
        text2: t('more.changePassword.invalidPasswordMinLength'),
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('more.changePassword.mismatchTitle'),
        text2: t('more.changePassword.mismatchBody'),
      });
      return;
    }

    if (formData.oldPassword === formData.newPassword) {
      Toast.show({
        type: 'error',
        text1: t('more.changePassword.invalidPasswordTitle'),
        text2: t('more.changePassword.differentFromCurrentBody'),
      });
      return;
    }

    // Submit
    changePasswordMutation.mutate({
      oldPassword: formData.oldPassword,
      newPassword: formData.newPassword,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('screens.changePassword')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('more.changePassword.subtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('more.changePassword.currentPassword')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <Input
                  placeholder={t('more.changePassword.currentPasswordPlaceholder')}
                  value={formData.oldPassword}
                  onChangeText={(text) => setFormData({ ...formData, oldPassword: text })}
                  secureTextEntry={!showPassword.old}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility('old')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword.old ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('more.changePassword.newPassword')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <Input
                  placeholder={t('more.changePassword.newPasswordPlaceholder')}
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  secureTextEntry={!showPassword.new}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility('new')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword.new ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>{t('more.changePassword.passwordMinHint')}</Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('more.changePassword.confirmPassword')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <Input
                  placeholder={t('more.changePassword.confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  secureTextEntry={!showPassword.confirm}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility('confirm')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword.confirm ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          disabled={changePasswordMutation.isPending}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Button
          title={
            changePasswordMutation.isPending ? t('more.changePassword.changing') : t('common.saveChanges')
          }
          onPress={handleSubmit}
          loading={changePasswordMutation.isPending}
          style={styles.saveButton}
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
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
  },
});

