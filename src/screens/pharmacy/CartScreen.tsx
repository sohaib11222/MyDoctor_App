import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';

type CartScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

interface CartItem {
  id: number;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  total: string;
  image: any;
}

export const CartScreen = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: 1, name: 'Benzaxapine Croplex', sku: '26565', price: '$19', quantity: 10, total: '$19', image: require('../../../assets/avatar.png') },
    { id: 2, name: 'Ombinazol Bonibamol', sku: '865727', price: '$22', quantity: 10, total: '$22', image: require('../../../assets/avatar.png') },
    { id: 3, name: 'Dantotate Dantodazole', sku: '978656', price: '$10', quantity: 10, total: '$10', image: require('../../../assets/avatar.png') },
    { id: 4, name: 'Alispirox Aerorenone', sku: '543252', price: '$26', quantity: 10, total: '$26', image: require('../../../assets/avatar.png') },
  ]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const updateQuantity = (id: number, change: number) => {
    setCartItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + change);
          const priceValue = parseFloat(item.price.replace('$', ''));
          return {
            ...item,
            quantity: newQuantity,
            total: `$${(priceValue * newQuantity).toFixed(2)}`,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (id: number) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.total.replace('$', ''));
  }, 0);

  const total = subtotal;

  const handleCheckout = () => {
    if (termsAccepted) {
      navigation.navigate('Checkout');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.cartItemsSection}>
          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Button
                title="Start Shopping"
                onPress={() => navigation.navigate('ProductCatalog')}
                style={styles.shopButton}
              />
            </View>
          ) : (
            cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProductDetails', { productId: item.id.toString() })}
                >
                  <Image source={item.image} style={styles.itemImage} />
                </TouchableOpacity>
                <View style={styles.itemDetails}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProductDetails', { productId: item.id.toString() })}
                  >
                    <Text style={styles.itemName}>{item.name}</Text>
                  </TouchableOpacity>
                  <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                  <Text style={styles.itemPrice}>{item.price}</Text>

                  {/* Quantity Controls */}
                  <View style={styles.quantitySection}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, -1)}
                      >
                        <Ionicons name="remove" size={16} color={colors.textWhite} />
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, 1)}
                      >
                        <Ionicons name="add" size={16} color={colors.textWhite} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{item.total}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Ionicons name="close" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Terms and Checkout */}
        {cartItems.length > 0 && (
          <View style={styles.checkoutSection}>
            <View style={styles.termsSection}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={16} color={colors.textWhite} />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I have read and accept the Terms & Conditions
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValueMain}>${total.toFixed(2)}</Text>
              </View>
              <Button
                title="Proceed to Checkout"
                onPress={handleCheckout}
                disabled={!termsAccepted}
                style={styles.checkoutButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  cartItemsSection: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    width: 50,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  removeButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 32,
  },
  checkoutSection: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  termsSection: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  totalSection: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalValueMain: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  checkoutButton: {
    marginTop: 16,
  },
});

