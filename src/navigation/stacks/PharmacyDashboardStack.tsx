import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PharmacyDashboardStackParamList } from '../types';
import { PharmacyDashboardScreen } from '../../screens/pharmacy-admin/PharmacyDashboardScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<PharmacyDashboardStackParamList>();

export const PharmacyDashboardStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader
            title={options.title || route.name}
            showBack={false}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="PharmacyDashboard" 
        component={PharmacyDashboardScreen}
        options={{ title: t('screens.pharmacyDashboard'), headerShown: false }}
      />
    </Stack.Navigator>
  );
};

