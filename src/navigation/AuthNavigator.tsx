import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { DoctorRegisterScreen } from '../screens/auth/DoctorRegisterScreen';
import { DoctorVerificationUploadScreen } from '../screens/auth/DoctorVerificationUploadScreen';
import { PharmacyVerificationUploadScreen } from '../screens/auth/PharmacyVerificationUploadScreen';
import { PendingApprovalScreen } from '../screens/auth/PendingApprovalScreen';
import { useAuth } from '../contexts/AuthContext';
// Pharmacy registration removed - not in site

const Stack = createNativeStackNavigator<AuthStackParamList>();

const DOCUMENTS_SUBMITTED_KEY = 'doctor_documents_submitted';
const PHARMACY_DOCUMENTS_SUBMITTED_KEY = 'pharmacy_documents_submitted';

export const AuthNavigator = () => {
  const { user } = useAuth();
  const [initialRoute, setInitialRoute] = React.useState<keyof AuthStackParamList>('Login');
  const [isReady, setIsReady] = React.useState(false);

  // Determine initial route based on user state
  React.useEffect(() => {
    const determineInitialRoute = async () => {
      if (user && user.role === 'doctor' && user.verificationStatus === 'pending') {
        // Check if documents have been submitted
        const documentsSubmitted = await AsyncStorage.getItem(DOCUMENTS_SUBMITTED_KEY);
        if (documentsSubmitted === 'true') {
          setInitialRoute('PendingApproval');
        } else {
          setInitialRoute('DoctorVerificationUpload');
        }
      } else if (
        user &&
        (user.role === 'pharmacy' || user.role === 'parapharmacy') &&
        String(user.status).toUpperCase() === 'PENDING'
      ) {
        const documentsSubmitted = await AsyncStorage.getItem(PHARMACY_DOCUMENTS_SUBMITTED_KEY);
        if (documentsSubmitted === 'true') {
          setInitialRoute('PendingApproval');
        } else {
          setInitialRoute('PharmacyVerificationUpload');
        }
      } else {
        setInitialRoute('Login');
      }
      setIsReady(true);
    };
    determineInitialRoute();
  }, [user]);

  // Don't render navigator until we know the initial route
  if (!isReady) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
      <Stack.Screen name="DoctorVerificationUpload" component={DoctorVerificationUploadScreen} />
      <Stack.Screen name="PharmacyVerificationUpload" component={PharmacyVerificationUploadScreen} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
};

