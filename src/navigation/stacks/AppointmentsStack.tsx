import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppointmentsStackParamList } from '../types';
import AppointmentsScreen from '../../screens/shared/AppointmentsScreen';
import AppointmentDetailsScreen from '../../screens/shared/AppointmentDetailsScreen';
import BookingScreen from '../../screens/shared/BookingScreen';
import CheckoutScreen from '../../screens/shared/CheckoutScreen';
import BookingSuccessScreen from '../../screens/shared/BookingSuccessScreen';
import { StartAppointmentScreen } from '../../screens/doctor/StartAppointmentScreen';
import { AvailableTimingsScreen } from '../../screens/doctor/AvailableTimingsScreen';
import { AppointmentRequestsScreen } from '../../screens/doctor/AppointmentRequestsScreen';
import { MyPatientsScreen } from '../../screens/doctor/MyPatientsScreen';
import { CustomHeader } from '../../components/common/CustomHeader';

const Stack = createNativeStackNavigator<AppointmentsStackParamList>();

export const AppointmentsStack = () => {
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
        options={{ title: 'Appointment Details' }}
      />
      <Stack.Screen 
        name="Booking" 
        component={BookingScreen}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen 
        name="BookingSuccess" 
        component={BookingSuccessScreen}
        options={{ title: 'Booking Confirmed', headerShown: false }}
      />
      <Stack.Screen 
        name="StartAppointment" 
        component={StartAppointmentScreen}
        options={{ title: 'Appointment Session' }}
      />
      <Stack.Screen 
        name="AvailableTimings" 
        component={AvailableTimingsScreen}
        options={{ title: 'Available Timings' }}
      />
      <Stack.Screen 
        name="AppointmentRequests" 
        component={AppointmentRequestsScreen}
        options={{ title: 'Appointment Requests' }}
      />
      <Stack.Screen 
        name="MyPatients" 
        component={MyPatientsScreen}
        options={{ title: 'My Patients' }}
      />
    </Stack.Navigator>
  );
};
