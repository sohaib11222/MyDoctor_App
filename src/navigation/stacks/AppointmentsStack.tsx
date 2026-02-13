import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppointmentsStackParamList } from '../types';
import AppointmentsScreen from '../../screens/shared/AppointmentsScreen';
import AppointmentDetailsScreen from '../../screens/shared/AppointmentDetailsScreen';
import VideoCallScreen from '../../screens/shared/VideoCallScreen';
import BookingScreen from '../../screens/shared/BookingScreen';
import CheckoutScreen from '../../screens/shared/CheckoutScreen';
import BookingSuccessScreen from '../../screens/shared/BookingSuccessScreen';
import { StartAppointmentScreen } from '../../screens/doctor/StartAppointmentScreen';
import { AvailableTimingsScreen } from '../../screens/doctor/AvailableTimingsScreen';
import { AppointmentRequestsScreen } from '../../screens/doctor/AppointmentRequestsScreen';
import { MyPatientsScreen } from '../../screens/doctor/MyPatientsScreen';
import { PrescriptionScreen } from '../../screens/shared/PrescriptionScreen';
import RequestRescheduleScreen from '../../screens/patient/RequestRescheduleScreen';
import PatientRescheduleRequestsScreen from '../../screens/patient/PatientRescheduleRequestsScreen';
import DoctorRescheduleRequestsScreen from '../../screens/doctor/DoctorRescheduleRequestsScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<AppointmentsStackParamList>();

export const AppointmentsStack = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const { t } = useTranslation();

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
        name="AppointmentsScreen" 
        component={AppointmentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AppointmentDetails" 
        component={AppointmentDetailsScreen}
        // headerShown={false}
        options={{ title: t('appointments.nav.appointmentDetails') }}
      />
      <Stack.Screen
        name="Prescription"
        component={PrescriptionScreen}
        options={{ title: t('screens.prescription'), headerShown: false }}
      />
      <Stack.Screen 
        name="Booking" 
        component={BookingScreen}
        options={{ title: t('appointments.nav.bookAppointment') }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: t('appointments.nav.checkout') }}
      />
      <Stack.Screen 
        name="BookingSuccess" 
        component={BookingSuccessScreen}
        options={{ title: t('appointments.nav.bookingConfirmed'), headerShown: false }}
      />
      <Stack.Screen 
        name="StartAppointment" 
        component={StartAppointmentScreen}
        options={{ title: t('appointments.nav.appointmentSession') }}
      />
      <Stack.Screen 
        name="AvailableTimings" 
        component={AvailableTimingsScreen}
        options={{ title: t('appointments.nav.availableTimings') }}
      />
      <Stack.Screen 
        name="AppointmentRequests" 
        component={AppointmentRequestsScreen}
        options={{ title: t('appointments.nav.appointmentRequests') }}
      />
      <Stack.Screen 
        name="MyPatients" 
        component={MyPatientsScreen}
        options={{ title: t('menu.myPatients') }}
      />
      <Stack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{ 
          title: t('appointments.nav.videoCall'),
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="RequestReschedule" 
        component={RequestRescheduleScreen}
        options={{ title: t('appointments.nav.requestReschedule') }}
      />
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
    </Stack.Navigator>
  );
};
