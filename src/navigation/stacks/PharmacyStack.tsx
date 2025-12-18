import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../types';
import { PharmacyHomeScreen } from '../../screens/pharmacy/PharmacyHomeScreen';
import { ProductCatalogScreen } from '../../screens/pharmacy/ProductCatalogScreen';
import { ProductDetailsScreen } from '../../screens/pharmacy/ProductDetailsScreen';
import { CartScreen } from '../../screens/pharmacy/CartScreen';
import { CheckoutScreen } from '../../screens/pharmacy/CheckoutScreen';
import { OrderHistoryScreen } from '../../screens/pharmacy/OrderHistoryScreen';
import { PaymentSuccessScreen } from '../../screens/pharmacy/PaymentSuccessScreen';
import { CustomHeader } from '../../components/common/CustomHeader';

const Stack = createNativeStackNavigator<PharmacyStackParamList>();

export const PharmacyStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader
            title={options.title || route.name}
            showBack={route.name !== 'PharmacyHome'}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="PharmacyHome" 
        component={PharmacyHomeScreen}
        options={{ title: 'Pharmacy', headerShown: false }}
      />
      <Stack.Screen 
        name="ProductCatalog" 
        component={ProductCatalogScreen}
        options={{ title: 'Medlife Medical' }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: 'Shopping Cart' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen 
        name="OrderHistory" 
        component={OrderHistoryScreen}
        options={{ title: 'Order History', headerShown: false }}
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{ title: 'Payment Success', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

