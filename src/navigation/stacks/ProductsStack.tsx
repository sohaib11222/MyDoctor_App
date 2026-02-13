import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductsStackParamList } from '../types';
import { ProductListScreen } from '../../screens/pharmacy-admin/ProductListScreen';
import { AddProductScreen } from '../../screens/pharmacy-admin/AddProductScreen';
import { EditProductScreen } from '../../screens/pharmacy-admin/EditProductScreen';
import { ProductDetailsScreen } from '../../screens/pharmacy-admin/ProductDetailsScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export const ProductsStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <CustomHeader
            title={options.title || route.name}
            showBack={route.name !== 'ProductList'}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen}
        options={{ title: t('screens.products'), headerShown: true }}
      />
      <Stack.Screen 
        name="AddProduct" 
        component={AddProductScreen}
        options={{ title: t('screens.addProduct') }}
      />
      <Stack.Screen 
        name="EditProduct" 
        component={EditProductScreen}
        options={{ title: t('screens.editProduct') }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: t('screens.productDetails') }}
      />
    </Stack.Navigator>
  );
};

