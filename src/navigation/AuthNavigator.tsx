import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { DoctorRegisterScreen } from '../screens/auth/DoctorRegisterScreen';
import { DoctorVerificationUploadScreen } from '../screens/auth/DoctorVerificationUploadScreen';
import { PendingApprovalScreen } from '../screens/auth/PendingApprovalScreen';
import { useAuth } from '../contexts/AuthContext';
// Pharmacy registration removed - not in site

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  const { user } = useAuth();

  // Determine initial route based on user state
  // If pending doctor, start at verification upload screen
  const getInitialRouteName = (): keyof AuthStackParamList => {
    if (user && user.role === 'doctor' && user.verificationStatus === 'pending') {
      return 'DoctorVerificationUpload';
    }
    return 'Login';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
      <Stack.Screen name="DoctorVerificationUpload" component={DoctorVerificationUploadScreen} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
};

