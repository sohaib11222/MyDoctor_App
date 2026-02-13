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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

type PharmacyRegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;


interface PharmacyRegisterFormData {
  name: string;
  phone: string;
  password: string;
}

export const PharmacyRegisterScreen = () => {
  const navigation = useNavigation<PharmacyRegisterScreenNavigationProp>();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const schema = yup.object({
    name: yup
      .string()
      .min(3, t('auth.validation.nameMin'))
      .required(t('auth.validation.nameRequired')),
    phone: yup.string().required(t('auth.validation.phoneRequired')),
    password: yup
      .string()
      .min(6, t('auth.validation.passwordMin'))
      .required(t('auth.validation.passwordRequired')),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PharmacyRegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: PharmacyRegisterFormData) => {
    setLoading(true);
    try {
      await registerUser(
        {
          fullName: data.name,
          email: `${data.phone}@pharmacy.temp`, // Temporary email for pharmacy
          password: data.password,
          phone: data.phone,
        },
        'pharmacy'
      );
      await AsyncStorage.removeItem('pharmacy_documents_submitted');

      navigation.reset({
        index: 0,
        routes: [{ name: 'PharmacyPhoneVerification' }],
      });
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
            <Ionicons name="medical" size={80} color={colors.primary} />
          </View>
        </View>

        {/* Registration Form */}
        <View style={styles.formContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('auth.pharmacyRegister.title')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('DoctorRegister')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>{t('auth.pharmacyRegister.doctorLink')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>{t('auth.pharmacyRegister.subtitle')}</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.pharmacyRegister.nameLabel')}
                  placeholder={t('auth.pharmacyRegister.namePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                  autoCapitalize="words"
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.pharmacyRegister.phoneLabel')}
                  placeholder={t('auth.pharmacyRegister.phonePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.pharmacyRegister.createPasswordLabel')}
                  placeholder={t('auth.pharmacyRegister.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <Button
              title={t('auth.pharmacyRegister.button')}
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submitButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.pharmacyRegister.dividerOr')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.socialButtonText}>{t('auth.pharmacyRegister.signInWithGoogle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-facebook" size={20} color={colors.primary} />
              <Text style={styles.socialButtonText}>{t('auth.pharmacyRegister.signInWithFacebook')}</Text>
            </TouchableOpacity>

            <View style={styles.loginLink}>
              <Text style={styles.loginLinkText}>{t('auth.pharmacyRegister.haveAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLinkButton}>{t('auth.pharmacyRegister.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    backgroundColor: colors.primaryLight,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  submitButton: {
    marginTop: 8,
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
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

