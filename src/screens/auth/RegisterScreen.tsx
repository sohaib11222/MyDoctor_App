import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth, RegisterData, UserRole } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;


const PHONE_E164_REGEX = /^\+\d{7,15}$/;

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'admin'>>('patient');
  const { t } = useTranslation();

  const schema = yup.object({
    fullName: yup
      .string()
      .min(2, t('auth.validation.fullNameMin'))
      .required(t('auth.validation.fullNameRequired')),
    email: yup
      .string()
      .email(t('auth.validation.invalidEmail'))
      .required(t('auth.validation.emailRequired')),
    password: yup
      .string()
      .min(6, t('auth.validation.passwordMin'))
      .required(t('auth.validation.passwordRequired')),
    password_confirmation: yup
      .string()
      .oneOf([yup.ref('password')], t('auth.validation.passwordsMustMatch'))
      .required(t('auth.validation.confirmPasswordRequired')),
    phone: yup.string().optional(),
    gender: yup.string().oneOf(['MALE', 'FEMALE', 'OTHER'], 'Invalid gender').optional(),
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      password_confirmation: '',
      phone: '',
      gender: undefined,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const role = selectedRole;

      if (role === 'pharmacy' || role === 'parapharmacy') {
        const phone = (data.phone || '').trim();
        if (!phone) {
          setError('phone', { type: 'manual', message: t('auth.validation.phoneRequired') });
          return;
        }
        if (!PHONE_E164_REGEX.test(phone)) {
          setError('phone', { type: 'manual', message: t('auth.validation.phoneE164') });
          return;
        }
      }

      await registerUser(
        {
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          phone: data.phone?.trim() || undefined,
          gender: data.gender,
        },
        role
      );

      if (role === 'pharmacy' || role === 'parapharmacy') {
        await AsyncStorage.removeItem('pharmacy_documents_submitted');
        navigation.reset({
          index: 0,
          routes: [{ name: 'PharmacyPhoneVerification' }],
        });
      } else if (role === 'doctor') {
        await AsyncStorage.removeItem('doctor_documents_submitted');
        navigation.reset({
          index: 0,
          routes: [{ name: 'DoctorVerificationUpload' }],
        });
      }
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image Section */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Image
              source={require('../../../assets/doctor_final.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Register Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>{t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.register.fullNameLabel')}
                placeholder={t('auth.register.fullNamePlaceholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.register.emailLabel')}
                placeholder={t('auth.register.emailPlaceholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.register.passwordLabel')}
                placeholder={t('auth.register.passwordPlaceholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                error={errors.password?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="password_confirmation"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.register.confirmPasswordLabel')}
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                error={errors.password_confirmation?.message}
                style={styles.input}
              />
            )}
          />

          {(selectedRole === 'pharmacy' || selectedRole === 'parapharmacy') && (
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.register.phoneLabel')}
                  placeholder={t('auth.register.phonePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  error={errors.phone?.message}
                  style={styles.input}
                />
              )}
            />
          )}

          <Button
            title={
              loading
                ? t('auth.register.buttonRegistering')
                : selectedRole === 'patient'
                  ? t('auth.register.buttonAsPatient')
                  : selectedRole === 'doctor'
                    ? t('auth.register.buttonAsDoctor')
                    : selectedRole === 'pharmacy'
                      ? t('auth.register.buttonAsPharmacy')
                      : t('auth.register.buttonAsParapharmacy')
            }
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.registerButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.register.dividerOr')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.roleButtonsRow}>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'patient' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('patient')}
            >
              <Feather name="user" size={20} color={selectedRole === 'patient' ? colors.textWhite : colors.primary} />
              <Text style={[styles.roleButtonText, selectedRole === 'patient' && styles.roleButtonTextActive]}>{t('auth.register.rolePatient')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'doctor' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('doctor')}
            >
              <Feather name="briefcase" size={20} color={selectedRole === 'doctor' ? colors.textWhite : colors.primary} />
              <Text style={[styles.roleButtonText, selectedRole === 'doctor' && styles.roleButtonTextActive]}>{t('auth.register.roleDoctor')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'pharmacy' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('pharmacy')}
            >
              <Feather name="shopping-bag" size={20} color={selectedRole === 'pharmacy' ? colors.textWhite : colors.primary} />
              <Text style={[styles.roleButtonText, selectedRole === 'pharmacy' && styles.roleButtonTextActive]}>{t('auth.register.rolePharmacy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'parapharmacy' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('parapharmacy')}
            >
              <Feather name="shopping-bag" size={20} color={selectedRole === 'parapharmacy' ? colors.textWhite : colors.primary} />
              <Text style={[styles.roleButtonText, selectedRole === 'parapharmacy' && styles.roleButtonTextActive]}>{t('auth.register.roleParapharmacy')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('auth.register.haveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('auth.register.loginLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    height: 200,
    // backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
  },
  imagePlaceholder: {
    width: 250,
    height: 120,
    borderRadius: 60,
    // backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    width: 222,
    height: 100,
  },
  formContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
    marginBottom: 24,
  },
  roleButton: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    gap: 6,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  roleButtonTextActive: {
    color: colors.textWhite,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
