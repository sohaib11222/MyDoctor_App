import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../types';
import { OrdersListScreen } from '../../screens/pharmacy-admin/OrdersListScreen';
import { OrderDetailsScreen } from '../../screens/pharmacy-admin/OrderDetailsScreen';
import { OrderStatusScreen } from '../../screens/pharmacy-admin/OrderStatusScreen';
import { CustomHeader } from '../../components/common/CustomHeader';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersStack = () => {
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
        options={{ title: 'Orders', headerShown: true }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen 
        name="OrderStatus" 
        component={OrderStatusScreen}
        options={{ title: 'Update Order Status' }}
      />
    </Stack.Navigator>
  );
};

