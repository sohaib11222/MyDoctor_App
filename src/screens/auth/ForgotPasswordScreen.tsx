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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as authApi from '../../services/auth';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// Step 1: Email validation schema
const emailSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
});

// Step 2: Code validation schema
const codeSchema = yup.object({
  code: yup
    .string()
    .required('Verification code is required')
    .length(6, 'Code must be 6 digits')
    .matches(/^\d+$/, 'Code must contain only numbers'),
});

// Step 3: Password validation schema
const passwordSchema = yup.object({
  newPassword: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

interface EmailFormData {
  email: string;
}

interface CodeFormData {
  code: string;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [step, setStep] = useState(1); // 1: Email, 2: Verify Code, 3: Reset Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Email form
  const emailForm = useForm<EmailFormData>({
    resolver: yupResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  // Step 2: Code form
  const codeForm = useForm<CodeFormData>({
    resolver: yupResolver(codeSchema),
    defaultValues: {
      code: '',
    },
  });

  // Step 3: Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Step 1: Request password reset
  const handleRequestReset = async (data: EmailFormData) => {
    setLoading(true);
    try {
      await authApi.requestPasswordReset(data.email);
      setEmail(data.email);
      setStep(2);
      Toast.show({
        type: 'success',
        text1: 'Code Sent',
        text2: 'Verification code sent to your email!',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send verification code';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
      // If email is not registered, stay on step 1
      if (errorMessage.toLowerCase().includes('not registered') || errorMessage.toLowerCase().includes('email is not')) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (data: CodeFormData) => {
    setLoading(true);
    try {
      await authApi.verifyPasswordResetCode(email, data.code);
      setCode(data.code);
      setStep(3);
      Toast.show({
        type: 'success',
        text1: 'Code Verified',
        text2: 'Code verified successfully!',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Invalid or expired verification code',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, data.newPassword);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Password reset successfully!',
      });
      // Navigate to login after a short delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      Toast.show({
        type: 'success',
        text1: 'Code Resent',
        text2: 'Verification code resent to your email!',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to resend code',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Enter your registered email address and we\'ll send you a verification code.';
      case 2:
        return 'Enter the 6-digit verification code sent to your email.';
      case 3:
        return 'Enter your new password.';
      default:
        return '';
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
              source={require('../../../assets/auth_image.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>{getStepTitle()}</Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <View style={[styles.stepIndicator, step >= 1 && styles.stepIndicatorActive]}>
                <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
              </View>
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.stepIndicator, step >= 2 && styles.stepIndicatorActive]}>
                <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
              </View>
              <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
              <View style={[styles.stepIndicator, step >= 3 && styles.stepIndicatorActive]}>
                <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
              </View>
            </View>
            <View style={styles.stepLabels}>
              <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Email</Text>
              <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Verify</Text>
              <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Reset</Text>
            </View>
          </View>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <View>
              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailForm.formState.errors.email?.message}
                    style={styles.input}
                  />
                )}
              />

              <Button
                title={loading ? 'Sending...' : 'Send Verification Code'}
                onPress={emailForm.handleSubmit(handleRequestReset)}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <View>
              <Controller
                control={codeForm.control}
                name="code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Input
                      label="Verification Code"
                      placeholder="Enter 6-digit code"
                      value={value}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/\D/g, '').slice(0, 6);
                        onChange(numericValue);
                      }}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      maxLength={6}
                      error={codeForm.formState.errors.code?.message}
                      style={styles.input}
                    />
                    <Text style={styles.emailHint}>Code sent to: <Text style={styles.emailBold}>{email}</Text></Text>
                  </View>
                )}
              />

              <Button
                title={loading ? 'Verifying...' : 'Verify Code'}
                onPress={codeForm.handleSubmit(handleVerifyCode)}
                loading={loading}
                style={styles.submitButton}
              />

              <TouchableOpacity
                onPress={handleResendCode}
                disabled={loading}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <View>
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    error={passwordForm.formState.errors.newPassword?.message}
                    style={styles.input}
                  />
                )}
              />

              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm new password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    error={passwordForm.formState.errors.confirmPassword?.message}
                    style={styles.input}
                  />
                )}
              />

              <Button
                title={loading ? 'Resetting...' : 'Reset Password'}
                onPress={passwordForm.handleSubmit(handleResetPassword)}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember Password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    width: 100,
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
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.textWhite,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  emailHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 16,
  },
  emailBold: {
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    marginBottom: 16,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
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
