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
import { useAuth, RegisterData } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Feather } from '@expo/vector-icons';

type DoctorRegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const schema = yup.object({
  name: yup
    .string()
    .min(5, 'Name must be at least 5 characters')
    .required('Name is required'),
  phone: yup
    .string()
    .required('Phone is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

interface DoctorRegisterFormData {
  name: string;
  phone: string;
  password: string;
}

export const DoctorRegisterScreen = () => {
  const navigation = useNavigation<DoctorRegisterScreenNavigationProp>();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorRegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: DoctorRegisterFormData) => {
    setLoading(true);
    try {
      await registerUser(
        {
          name: data.name,
          email: data.name.toLowerCase().replace(/\s+/g, '') + '@doctor.com', // Generate email for doctor
          password: data.password,
          phone: data.phone,
        },
        'doctor'
      );
      // Navigate to doctor verification upload after successful registration
      setLoading(false);
      // Use setTimeout to ensure navigation happens after state updates
      setTimeout(() => {
        navigation.navigate('DoctorVerificationUpload');
      }, 100);
    } catch (error) {
      // Error is handled in AuthContext
      setLoading(false);
      // For development/testing: still navigate even on error
      // In production, remove this and only navigate on success
      setTimeout(() => {
        navigation.navigate('DoctorVerificationUpload');
      }, 100);
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
          <Text style={styles.title}>Doctor Register</Text>
          <Text style={styles.subtitle}>Create your doctor account</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Name"
                placeholder="Enter your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone"
                placeholder="Enter your phone number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                error={errors.phone?.message}
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
                  <Text style={styles.passwordLabel}>Create Password</Text>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Input
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  style={styles.input}
                />
              </View>
            )}
          />

          <Button
            title={loading ? 'Signing Up...' : 'Sign Up'}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.signUpButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register as Patient Button */}
          <Button
            title="Register as Patient"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
            style={styles.patientButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have account? </Text>
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
  signUpButton: {
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
  patientButton: {
    marginBottom: 24,
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
  headerImage: {
    width: 100,
    height: 100,
  },
});

