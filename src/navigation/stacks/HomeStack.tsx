import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HomeScreen } from '../../screens/public/HomeScreen';
import SearchScreen from '../../screens/public/SearchScreen';
import DoctorProfileScreen from '../../screens/public/DoctorProfileScreen';
import DoctorGridScreen from '../../screens/public/DoctorGridScreen';
import MapViewScreen from '../../screens/public/MapViewScreen';
import BookingScreen from '../../screens/shared/BookingScreen';
import { PatientSearchScreen } from '../../screens/doctor/PatientSearchScreen';
import { PatientProfileScreen } from '../../screens/doctor/PatientProfileScreen';
import { CustomHeader } from '../../components/common/CustomHeader';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
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
        name="HomeScreen" 
        component={HomeScreen}
        options={{ title: 'Home', headerShown: false }}
      />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ 
          title: 'Search Doctors',
          header: ({ route, options }) => (
            <CustomHeader
              title={options.title || route.name}
              showBack={true}
              noBorderRadius={true}
            />
          ),
        }}
      />
      <Stack.Screen 
        name="DoctorProfile" 
        component={DoctorProfileScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <Stack.Screen 
        name="DoctorGrid" 
        component={DoctorGridScreen}
        options={{ title: 'Doctor Grid' }}
      />
      <Stack.Screen 
        name="MapView" 
        component={MapViewScreen}
        options={{ title: 'Map View' }}
      />
      <Stack.Screen 
        name="Booking" 
        component={BookingScreen}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen 
        name="PatientSearch" 
        component={PatientSearchScreen}
        options={{ title: 'Search Patients' }}
      />
      <Stack.Screen 
        name="PatientProfile" 
        component={PatientProfileScreen}
        options={{ title: 'Patient Profile' }}
      />
    </Stack.Navigator>
  );
};
