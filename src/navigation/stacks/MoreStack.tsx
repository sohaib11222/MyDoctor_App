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
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreStack = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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
        options={{ title: t('screens.more'), headerShown: false }}
      />
      <Stack.Screen 
        name="PatientDashboard" 
        component={PatientDashboardScreen}
        options={{ title: t('screens.dashboard') }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: t('screens.profile') }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: t('screens.settings') }}
      />
      <Stack.Screen 
        name="Language" 
        component={LanguageScreen}
        options={{ title: t('screens.language') }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{ title: t('screens.changePassword') }}
      />
      {isDoctor ? (
        <>
          <Stack.Screen 
            name="ProfileSettings" 
            component={ProfileSettingsScreen}
            options={{ title: t('screens.profileSettings') }}
          />
          <Stack.Screen 
            name="SocialLinks" 
            component={SocialLinksScreen}
            options={{ title: t('screens.socialLinks') }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="PatientProfileSettings" 
          component={PatientProfileSettingsScreen}
          options={{ title: t('screens.profileSettings') }}
        />
      )}
      <Stack.Screen 
        name="MedicalRecords" 
        component={MedicalRecordsScreen}
        options={{ title: t('screens.medicalRecords') }}
      />
      <Stack.Screen
        name="Prescription"
        component={PrescriptionScreen}
        options={{ title: t('screens.prescription'), headerShown: false }}
      />
      <Stack.Screen 
        name="Dependents" 
        component={DependentsScreen}
        options={{ title: t('screens.dependents') }}
      />
      <Stack.Screen 
        name="Favourites" 
        component={FavouritesScreen}
        options={{ title: t('screens.favourites') }}
      />
      {isPatient && (
        <Stack.Screen 
          name="OrderHistory" 
          component={require('../../screens/pharmacy/OrderHistoryScreen').OrderHistoryScreen}
          options={{ title: t('screens.orderHistory') }}
        />
      )}
      {isPatient && (
        <Stack.Screen 
          name="OrderDetails" 
          component={require('../../screens/pharmacy/OrderDetailsScreen').OrderDetailsScreen}
          options={{ title: t('screens.orderDetails') }}
        />
      )}
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: t('screens.notifications'), headerShown: false }}
      />
      <Stack.Screen 
        name="Invoices" 
        component={isDoctor ? DoctorInvoicesScreen : InvoicesScreen}
        options={{ title: t('screens.invoices') }}
      />
      <Stack.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{ title: t('screens.documents') }}
      />
      {/* Doctor-specific screens */}
      <Stack.Screen 
        name="DoctorDashboard" 
        component={DoctorDashboardScreen}
        options={{ title: t('screens.dashboard') }}
      />
      <Stack.Screen 
        name="MyPatients" 
        component={MyPatientsScreen}
        options={{ title: t('screens.myPatients') }}
      />
      <Stack.Screen 
        name="Reviews" 
        component={ReviewsScreen}
        options={{ title: t('screens.reviews') }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionPlansScreen}
        options={{ title: t('screens.subscriptionPlans') }}
      />
      <Stack.Screen 
        name="PayoutSettings" 
        component={PayoutSettingsScreen}
        options={{ title: t('screens.payoutSettings') }}
      />
      <Stack.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ title: t('screens.announcements') }}
      />
      {isAdmin && (
        <Stack.Screen 
          name="AdminOrders" 
          component={AdminOrdersScreen}
          options={{ title: t('screens.adminOrders') }}
        />
      )}
      {/* Reschedule Requests */}
      {!isDoctor && (
        <Stack.Screen 
          name="PatientRescheduleRequests" 
          component={PatientRescheduleRequestsScreen}
          options={{ title: t('screens.patientRescheduleRequestsTitle') }}
        />
      )}
      {isDoctor && (
        <Stack.Screen 
          name="DoctorRescheduleRequests" 
          component={DoctorRescheduleRequestsScreen}
          options={{ title: t('screens.doctorRescheduleRequestsTitle') }}
        />
      )}
      {/* Pharmacy-specific screens */}
      <Stack.Screen 
        name="PharmacyProfile" 
        component={PharmacyProfileScreen}
        options={{ title: t('screens.profile') }}
      />
      <Stack.Screen 
        name="PharmacySettings" 
        component={PharmacySettingsScreen}
        options={{ title: t('screens.settings') }}
      />
      <Stack.Screen 
        name="PharmacySubscription" 
        component={PharmacySubscriptionPlansScreen}
        options={{ title: t('screens.subscriptionPlans') }}
      />
    </Stack.Navigator>
  );
};
