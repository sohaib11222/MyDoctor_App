import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { DoctorRegisterScreen } from '../screens/auth/DoctorRegisterScreen';
import { DoctorVerificationUploadScreen } from '../screens/auth/DoctorVerificationUploadScreen';
import { PendingApprovalScreen } from '../screens/auth/PendingApprovalScreen';
import { PharmacyRegisterScreen } from '../screens/auth/PharmacyRegisterScreen';
import { PharmacyRegisterStep1Screen } from '../screens/auth/PharmacyRegisterStep1Screen';
import { PharmacyRegisterStep2Screen } from '../screens/auth/PharmacyRegisterStep2Screen';
import { PharmacyRegisterStep3Screen } from '../screens/auth/PharmacyRegisterStep3Screen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
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
      <Stack.Screen name="PharmacyRegister" component={PharmacyRegisterScreen} />
      <Stack.Screen name="PharmacyRegisterStep1" component={PharmacyRegisterStep1Screen} />
      <Stack.Screen name="PharmacyRegisterStep2" component={PharmacyRegisterStep2Screen} />
      <Stack.Screen name="PharmacyRegisterStep3" component={PharmacyRegisterStep3Screen} />
    </Stack.Navigator>
  );
};

