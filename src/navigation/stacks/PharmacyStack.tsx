import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyStackParamList } from '../types';
import { PharmacyHomeScreen } from '../../screens/pharmacy/PharmacyHomeScreen';
import { PharmacySearchScreen } from '../../screens/pharmacy/PharmacySearchScreen';
import { PharmacyDetailsScreen } from '../../screens/pharmacy/PharmacyDetailsScreen';
import { ProductCatalogScreen } from '../../screens/pharmacy/ProductCatalogScreen';
import { ProductDetailsScreen } from '../../screens/pharmacy/ProductDetailsScreen';
import { CartScreen } from '../../screens/pharmacy/CartScreen';
import { CheckoutScreen } from '../../screens/pharmacy/CheckoutScreen';
import { OrderHistoryScreen } from '../../screens/pharmacy/OrderHistoryScreen';
import { OrderDetailsScreen } from '../../screens/pharmacy/OrderDetailsScreen';
import { PaymentSuccessScreen } from '../../screens/pharmacy/PaymentSuccessScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useCart } from '../../contexts/CartContext';
import { colors } from '../../constants/colors';

const Stack = createNativeStackNavigator<PharmacyStackParamList>();

export const PharmacyStack = () => {
  const { t } = useTranslation();

  // Cart icon component for header - defined inside to access context
  const CartIconHeader = () => {
    const navigation = useNavigation<NativeStackNavigationProp<PharmacyStackParamList>>();
    const { getCartItemCount } = useCart();
    const cartCount = getCartItemCount();

    return (
      <TouchableOpacity
        style={styles.cartIconContainer}
        onPress={() => navigation.navigate('Cart')}
        activeOpacity={0.7}
      >
        <Ionicons name="cart-outline" size={24} color={colors.textWhite} />
        {cartCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => {
          // Show cart icon on pharmacy screens except Cart and Checkout
          const showCartIcon = 
            route.name !== 'PharmacyHome' && 
            route.name !== 'Cart' && 
            route.name !== 'Checkout' &&
            route.name !== 'PaymentSuccess';
          
          return (
            <CustomHeader
              title={options.title || route.name}
              showBack={route.name !== 'PharmacyHome'}
              rightComponent={showCartIcon ? <CartIconHeader /> : undefined}
            />
          );
        },
      }}
    >
      <Stack.Screen 
        name="PharmacyHome" 
        component={PharmacyHomeScreen}
        options={{ title: t('pharmacy.nav.pharmacy'), headerShown: false }}
      />
      <Stack.Screen 
        name="PharmacySearch" 
        component={PharmacySearchScreen}
        options={{ title: t('pharmacy.nav.searchPharmacies') }}
      />
      <Stack.Screen 
        name="PharmacyDetails" 
        component={PharmacyDetailsScreen}
        options={{ title: t('pharmacy.nav.pharmacyDetails') }}
      />
      <Stack.Screen 
        name="ProductCatalog" 
        component={ProductCatalogScreen}
        options={{ title: t('pharmacy.nav.products') }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: t('pharmacy.nav.productDetails') }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: t('pharmacy.nav.cart') }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: t('pharmacy.nav.checkout') }}
      />
      <Stack.Screen 
        name="OrderHistory" 
        component={OrderHistoryScreen}
        options={{ title: t('pharmacy.nav.orderHistory'), headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen}
        options={{ title: t('pharmacy.nav.orderDetails') }}
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{ title: t('pharmacy.nav.paymentSuccess'), headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  cartIconContainer: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
  },
});

