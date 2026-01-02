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
import { useCart } from '../../contexts/CartContext';
import { API_BASE_URL } from '../../config/api';

type CartScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.0.114';
  }
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

export const CartScreen = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeFromCart(productId);
  };

  const subtotal = getCartTotal();
  const shipping = subtotal >= 50 ? 0 : 25;
  const tax = 0;
  const total = subtotal + shipping + tax;

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
            cartItems.map((item) => {
              const normalizedImageUrl = normalizeImageUrl(item.image);
              const defaultAvatar = require('../../../assets/avatar.png');
              const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

              return (
                <View key={item._id} style={styles.cartItem}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
                  >
                    <Image source={imageSource} style={styles.itemImage} defaultSource={defaultAvatar} />
                  </TouchableOpacity>
                  <View style={styles.itemDetails}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
                    >
                      <Text style={styles.itemName}>{item.name}</Text>
                    </TouchableOpacity>
                    {item.sku && <Text style={styles.itemSku}>SKU: {item.sku}</Text>}
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>

                    {/* Quantity Controls */}
                    <View style={styles.quantitySection}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleQuantityChange(item._id, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={16} color={colors.textWhite} />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleQuantityChange(item._id, item.quantity + 1)}
                          disabled={item.stock && item.quantity >= item.stock}
                        >
                          <Ionicons name="add" size={16} color={colors.textWhite} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item._id, item.name)}
                  >
                    <Ionicons name="close" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })
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
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={() => {
                  clearCart();
                }}
              >
                <Text style={styles.clearCartButtonText}>Clear Cart</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>
                  {shipping === 0 ? (
                    <Text style={styles.freeShippingText}>Free</Text>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </Text>
              </View>
              {tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
                </View>
              )}
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
  clearCartButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    alignSelf: 'flex-start',
  },
  clearCartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
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
  freeShippingText: {
    color: colors.success,
    fontWeight: '600',
  },
});

