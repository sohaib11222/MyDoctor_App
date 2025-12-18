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
import { SubscriptionPlansScreen } from '../../screens/doctor/SubscriptionPlansScreen';
import { AnnouncementsScreen } from '../../screens/doctor/AnnouncementsScreen';
import { PatientSearchScreen } from '../../screens/doctor/PatientSearchScreen';
// Pharmacy screens
import { PharmacyProfileScreen } from '../../screens/pharmacy-admin/PharmacyProfileScreen';
import { PharmacySettingsScreen } from '../../screens/pharmacy-admin/PharmacySettingsScreen';
import { CustomHeader } from '../../components/common/CustomHeader';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export const MoreStack = () => {
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
        name="MedicalRecords" 
        component={MedicalRecordsScreen}
        options={{ title: 'Medical Records' }}
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
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="Invoices" 
        component={InvoicesScreen}
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
        component={PatientSearchScreen}
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
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
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
    </Stack.Navigator>
  );
};
