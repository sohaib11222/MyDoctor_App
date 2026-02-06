import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../types';
import { MoreScreen } from '../../screens/shared/MoreScreen';
import { ProfileScreen } from '../../screens/shared/ProfileScreen';
import { SettingsScreen } from '../../screens/shared/SettingsScreen';
import { PatientDashboardScreen } from '../../screens/patient/PatientDashboardScreen';
import { MedicalRecordsScreen } from '../../screens/patient/MedicalRecordsScreen';
import { DependentsScreen } from '../../screens/patient/DependentsScreen';
import { FavouritesScreen } from '../../screens/patient/FavouritesScreen';
import { NotificationsScreen } from '../../screens/patient/NotificationsScreen';
import { InvoicesScreen } from '../../screens/patient/InvoicesScreen';
import { DocumentsScreen } from '../../screens/patient/DocumentsScreen';
// Doctor screens
import { DoctorDashboardScreen } from '../../screens/doctor/DoctorDashboardScreen';
import { ReviewsScreen } from '../../screens/doctor/ReviewsScreen';
import { InvoicesScreen as DoctorInvoicesScreen } from '../../screens/doctor/InvoicesScreen';
import { SubscriptionPlansScreen } from '../../screens/doctor/SubscriptionPlansScreen';
import { PayoutSettingsScreen } from '../../screens/doctor/PayoutSettingsScreen';
import { AnnouncementsScreen } from '../../screens/doctor/AnnouncementsScreen';
import { PatientSearchScreen } from '../../screens/doctor/PatientSearchScreen';
// Pharmacy screens
import { PharmacyProfileScreen } from '../../screens/pharmacy-admin/PharmacyProfileScreen';
import { PharmacySettingsScreen } from '../../screens/pharmacy-admin/PharmacySettingsScreen';
import { PharmacySubscriptionPlansScreen } from '../../screens/pharmacy-admin/PharmacySubscriptionPlansScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { MyPatientsScreen } from '../../screens/doctor/MyPatientsScreen';
import { ProfileSettingsScreen } from '../../screens/doctor/ProfileSettingsScreen';
import { SocialLinksScreen } from '../../screens/doctor/SocialLinksScreen';
import { ChangePasswordScreen } from '../../screens/shared/ChangePasswordScreen';
import { PatientProfileSettingsScreen } from '../../screens/patient/PatientProfileSettingsScreen';
import { AdminOrdersScreen } from '../../screens/admin/AdminOrdersScreen';
import PatientRescheduleRequestsScreen from '../../screens/patient/PatientRescheduleRequestsScreen';
import DoctorRescheduleRequestsScreen from '../../screens/doctor/DoctorRescheduleRequestsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { PrescriptionScreen } from '../../screens/shared/PrescriptionScreen';
import { LanguageScreen } from '../../screens/shared/LanguageScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreStack = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor' || false;
  const isPatient = user?.role === 'patient' || false;
  const isAdmin = ((user as any)?.role === 'admin' || (user as any)?.role === 'ADMIN') || false;
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader
            title={options.title || route.name}
            showBack={true}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="MoreScreen" 
        component={MoreScreen}
        options={{ title: 'More', headerShown: false }}
      />
      <Stack.Screen 
        name="PatientDashboard" 
        component={PatientDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Language" 
        component={LanguageScreen}
        options={{ title: 'Language' }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      {isDoctor ? (
        <>
          <Stack.Screen 
            name="ProfileSettings" 
            component={ProfileSettingsScreen}
            options={{ title: 'Profile Settings' }}
          />
          <Stack.Screen 
            name="SocialLinks" 
            component={SocialLinksScreen}
            options={{ title: 'Social Media Links' }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="PatientProfileSettings" 
          component={PatientProfileSettingsScreen}
          options={{ title: 'Profile Settings' }}
        />
      )}
      <Stack.Screen 
        name="MedicalRecords" 
        component={MedicalRecordsScreen}
        options={{ title: 'Medical Records' }}
      />
      <Stack.Screen
        name="Prescription"
        component={PrescriptionScreen}
        options={{ title: 'Prescription', headerShown: false }}
      />
      <Stack.Screen 
        name="Dependents" 
        component={DependentsScreen}
        options={{ title: 'Dependents' }}
      />
      <Stack.Screen 
        name="Favourites" 
        component={FavouritesScreen}
        options={{ title: 'Favourites' }}
      />
      {isPatient && (
        <Stack.Screen 
          name="OrderHistory" 
          component={require('../../screens/pharmacy/OrderHistoryScreen').OrderHistoryScreen}
          options={{ title: 'Order History' }}
        />
      )}
      {isPatient && (
        <Stack.Screen 
          name="OrderDetails" 
          component={require('../../screens/pharmacy/OrderDetailsScreen').OrderDetailsScreen}
          options={{ title: 'Order Details' }}
        />
      )}
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications', headerShown: false }}
      />
      <Stack.Screen 
        name="Invoices" 
        component={isDoctor ? DoctorInvoicesScreen : InvoicesScreen}
        options={{ title: 'Invoices' }}
      />
      <Stack.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
      {/* Doctor-specific screens */}
      <Stack.Screen 
        name="DoctorDashboard" 
        component={DoctorDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="MyPatients" 
        component={MyPatientsScreen}
        options={{ title: 'My Patients' }}
      />
      <Stack.Screen 
        name="Reviews" 
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionPlansScreen}
        options={{ title: 'Subscription Plans' }}
      />
      <Stack.Screen 
        name="PayoutSettings" 
        component={PayoutSettingsScreen}
        options={{ title: 'Payout Settings' }}
      />
      <Stack.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
      {isAdmin && (
        <Stack.Screen 
          name="AdminOrders" 
          component={AdminOrdersScreen}
          options={{ title: 'All Orders' }}
        />
      )}
      {/* Reschedule Requests */}
      {!isDoctor && (
        <Stack.Screen 
          name="PatientRescheduleRequests" 
          component={PatientRescheduleRequestsScreen}
          options={{ title: 'My Reschedule Requests' }}
        />
      )}
      {isDoctor && (
        <Stack.Screen 
          name="DoctorRescheduleRequests" 
          component={DoctorRescheduleRequestsScreen}
          options={{ title: 'Reschedule Requests' }}
        />
      )}
      {/* Pharmacy-specific screens */}
      <Stack.Screen 
        name="PharmacyProfile" 
        component={PharmacyProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="PharmacySettings" 
        component={PharmacySettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="PharmacySubscription" 
        component={PharmacySubscriptionPlansScreen}
        options={{ title: 'Subscription Plans' }}
      />
    </Stack.Navigator>
  );
};
