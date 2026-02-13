import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../types';
import { OrdersListScreen } from '../../screens/pharmacy-admin/OrdersListScreen';
import { OrderDetailsScreen } from '../../screens/pharmacy-admin/OrderDetailsScreen';
import { OrderStatusScreen } from '../../screens/pharmacy-admin/OrderStatusScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader
            title={options.title || route.name}
            showBack={route.name !== 'OrdersList'}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="OrdersList" 
        component={OrdersListScreen}
        options={{ title: t('screens.orders'), headerShown: true }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen}
        options={{ title: t('screens.orderDetails') }}
      />
      <Stack.Screen 
        name="OrderStatus" 
        component={OrderStatusScreen}
        options={{ title: t('screens.updateOrderStatus') }}
      />
    </Stack.Navigator>
  );
};

