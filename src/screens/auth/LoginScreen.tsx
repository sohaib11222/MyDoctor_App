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
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';
 

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;


interface LoginFormData {
  email: string;
  password: string;
}

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const schema = yup.object({
    email: yup
      .string()
      .email(t('auth.validation.invalidEmail'))
      .required(t('auth.validation.emailRequired')),
    password: yup.string().required(t('auth.validation.passwordRequired')),
  });

  // Navigate pending doctors to verification upload after login
  useEffect(() => {
    if (user && user.role === 'doctor' && user.verificationStatus === 'pending') {
      // Small delay to ensure navigation is ready
      const timer = setTimeout(() => {
        // Use replace to prevent going back to login
        navigation.replace('DoctorVerificationUpload');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, navigation]);

  // Navigate pending pharmacy/parapharmacy users to phone verification/upload after login
  useEffect(() => {
    const isPharmacy = user && (user.role === 'pharmacy' || user.role === 'parapharmacy');
    const isPending = String((user as any)?.status || '').toUpperCase() === 'PENDING';

    if (isPharmacy && isPending) {
      const timer = setTimeout(() => {
        if (!(user as any)?.isPhoneVerified) {
          navigation.replace('PharmacyPhoneVerification');
        } else {
          navigation.replace('PharmacyVerificationUpload');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [navigation, user]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      // Backend determines role from user account, so we don't pass role
      await login(data.email, data.password);
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

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.login.emailLabel')}
                placeholder={t('auth.login.emailPlaceholder')}
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
              <View>
                <View style={styles.passwordHeader}>
                  <Text style={styles.passwordLabel}>{t('auth.login.passwordLabel')}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
                  </TouchableOpacity>
                </View>
                <Input
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.password?.message}
                  style={styles.input}
                />
              </View>
            )}
          />

          <Button
            title={loading ? t('auth.login.buttonLoading') : t('auth.login.button')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('auth.login.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('auth.login.registerLink')}</Text>
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
  headerImage: {
    width: 222,
    height: 170,
  },
  imagePlaceholder: {
    width: 250,
    height: 200,
    borderRadius: 80,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
