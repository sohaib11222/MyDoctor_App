import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import * as paymentApi from '../../services/payment';
import * as orderApi from '../../services/order';
import Toast from 'react-native-toast-message';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

export const CheckoutScreen = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.fullName?.split(' ')[0] || '',
    lastName: user?.fullName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    shipToDifferentAddress: false,
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      zip: '',
    },
    orderNotes: '',
    paymentMethod: 'CARD' as 'CARD' | 'PAYPAL' | 'DUMMY',
    cardName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const subtotal = getCartTotal();
  const shipping = subtotal >= 50 ? 0 : 25;
  const tax = 0;
  const total = subtotal + shipping + tax;

  useEffect(() => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'warning',
        text1: 'Empty Cart',
        text2: 'Your cart is empty',
      });
      navigation.navigate('ProductCatalog');
    }
  }, [cartItems, navigation]);

  // Create order and process payment mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // Prepare order items
      const orderItems = cartItems.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      }));

      // Prepare order data
      const orderData: orderApi.CreateOrderData = {
        items: orderItems,
      };

      // Add shipping address only if provided and complete
      if (formData.shipToDifferentAddress) {
        if (
          formData.shippingAddress.line1?.trim() &&
          formData.shippingAddress.city?.trim() &&
          formData.shippingAddress.state?.trim() &&
          formData.shippingAddress.country?.trim() &&
          formData.shippingAddress.zip?.trim()
        ) {
          orderData.shippingAddress = {
            line1: formData.shippingAddress.line1.trim(),
            line2: formData.shippingAddress.line2?.trim() || undefined,
            city: formData.shippingAddress.city.trim(),
            state: formData.shippingAddress.state.trim(),
            country: formData.shippingAddress.country.trim(),
            zip: formData.shippingAddress.zip.trim(),
          };
        } else {
          throw new Error('Please fill in all required shipping address fields');
        }
      }

      // Add payment method if provided
      if (formData.paymentMethod) {
        orderData.paymentMethod = formData.paymentMethod;
      }

      // Create order (payment is processed immediately during checkout)
      const orderResponse = await orderApi.createOrder(orderData);

      return { order: orderResponse.data };
    },
    onSuccess: (data) => {
      Toast.show({
        type: 'success',
        text1: 'Order Placed Successfully',
        text2: `Order #${data.order.orderNumber} has been placed and payment processed!`,
      });
      clearCart();
      navigation.navigate('PaymentSuccess', { orderId: data.order._id });
    },
    onError: (error: any) => {
      let errorMessage = 'Order failed';
      
      if (error.response?.data) {
        // Handle validation errors
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors;
          if (Array.isArray(validationErrors)) {
            errorMessage = validationErrors.map((err: any) => err.message || err.msg).join(', ');
          } else if (typeof validationErrors === 'object') {
            errorMessage = Object.values(validationErrors).flat().join(', ');
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (__DEV__) {
        console.error('Checkout error:', {
          error,
          response: error.response?.data,
          message: errorMessage,
        });
      }

      Toast.show({
        type: 'error',
        text1: 'Order Failed',
        text2: errorMessage,
      });
    },
  });

  const handleSubmit = () => {
    if (!termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Terms Required',
        text2: 'Please accept the Terms & Conditions to continue',
      });
      return;
    }

    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Login Required',
        text2: 'Please login to complete checkout',
      });
      return;
    }

    if (formData.paymentMethod === 'CARD') {
      if (
        !formData.cardName ||
        !formData.cardNumber ||
        !formData.expiryMonth ||
        !formData.expiryYear ||
        !formData.cvv
      ) {
        Toast.show({
          type: 'error',
          text1: 'Card Details Required',
          text2: 'Please fill in all card details',
        });
        return;
      }
    }

    // Create order and process payment
    checkoutMutation.mutate();
  };

  if (cartItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Billing Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing details</Text>

          {/* Personal Information */}
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Personal Information</Text>
            <Input
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="Enter first name"
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Enter last name"
            />
            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter email"
              keyboardType="email-address"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter phone"
              keyboardType="phone-pad"
            />
            {!user && (
              <TouchableOpacity style={styles.existingCustomerLink}>
                <Text style={styles.existingCustomerText}>
                  Existing Customer? <Text style={styles.linkText}>Click here to login</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Shipping Details */}
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Shipping Details</Text>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setFormData({ ...formData, shipToDifferentAddress: !formData.shipToDifferentAddress })}
            >
              <View
                style={[
                  styles.checkbox,
                  formData.shipToDifferentAddress && styles.checkboxChecked,
                ]}
              >
                {formData.shipToDifferentAddress && (
                  <Ionicons name="checkmark" size={16} color={colors.textWhite} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Ship to a different address?</Text>
            </TouchableOpacity>
            {formData.shipToDifferentAddress && (
              <>
                <Input
                  label="Address Line 1"
                  value={formData.shippingAddress.line1}
                  onChangeText={(text) => setFormData({ 
                    ...formData, 
                    shippingAddress: { ...formData.shippingAddress, line1: text } 
                  })}
                  placeholder="Enter address line 1"
                  required
                />
                <Input
                  label="Address Line 2 (Optional)"
                  value={formData.shippingAddress.line2}
                  onChangeText={(text) => setFormData({ 
                    ...formData, 
                    shippingAddress: { ...formData.shippingAddress, line2: text } 
                  })}
                  placeholder="Enter address line 2"
                />
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Input
                      label="City"
                      value={formData.shippingAddress.city}
                      onChangeText={(text) => setFormData({ 
                        ...formData, 
                        shippingAddress: { ...formData.shippingAddress, city: text } 
                      })}
                      placeholder="Enter city"
                      required
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Input
                      label="State"
                      value={formData.shippingAddress.state}
                      onChangeText={(text) => setFormData({ 
                        ...formData, 
                        shippingAddress: { ...formData.shippingAddress, state: text } 
                      })}
                      placeholder="Enter state"
                      required
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Input
                      label="Country"
                      value={formData.shippingAddress.country}
                      onChangeText={(text) => setFormData({ 
                        ...formData, 
                        shippingAddress: { ...formData.shippingAddress, country: text } 
                      })}
                      placeholder="Enter country"
                      required
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Input
                      label="ZIP Code"
                      value={formData.shippingAddress.zip}
                      onChangeText={(text) => setFormData({ 
                        ...formData, 
                        shippingAddress: { ...formData.shippingAddress, zip: text } 
                      })}
                      placeholder="Enter ZIP"
                      keyboardType="numeric"
                      required
                    />
                  </View>
                </View>
              </>
            )}
            <View style={styles.textAreaContainer}>
              <Text style={styles.label}>Order notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={formData.orderNotes}
                onChangeText={(text) => setFormData({ ...formData, orderNotes: text })}
                placeholder="Any special instructions for your order..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={5}
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Payment Method</Text>

            {/* Credit Card Option */}
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setFormData({ ...formData, paymentMethod: 'CARD' })}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    formData.paymentMethod === 'CARD' && styles.radioChecked,
                  ]}
                >
                  {formData.paymentMethod === 'CARD' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.paymentOptionText}>Credit card</Text>
              </View>
            </TouchableOpacity>

            {formData.paymentMethod === 'CARD' && (
              <View style={styles.paymentDetails}>
                <Input
                  label="Name on Card"
                  value={formData.cardName}
                  onChangeText={(text) => setFormData({ ...formData, cardName: text })}
                  placeholder="Enter name"
                  required={formData.paymentMethod === 'CARD'}
                />
                <Input
                  label="Card Number"
                  value={formData.cardNumber}
                  onChangeText={(text) => setFormData({ ...formData, cardNumber: text })}
                  placeholder="1234 5678 9876 5432"
                  keyboardType="numeric"
                  required={formData.paymentMethod === 'CARD'}
                />
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Input
                      label="Expiry Month"
                      value={formData.expiryMonth}
                      onChangeText={(text) => setFormData({ ...formData, expiryMonth: text })}
                      placeholder="MM"
                      keyboardType="numeric"
                      maxLength={2}
                      required={formData.paymentMethod === 'CARD'}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Input
                      label="Expiry Year"
                      value={formData.expiryYear}
                      onChangeText={(text) => setFormData({ ...formData, expiryYear: text })}
                      placeholder="YY"
                      keyboardType="numeric"
                      maxLength={2}
                      required={formData.paymentMethod === 'CARD'}
                    />
                  </View>
                </View>
                <Input
                  label="CVV"
                  value={formData.cvv}
                  onChangeText={(text) => setFormData({ ...formData, cvv: text })}
                  placeholder="CVV"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  required={formData.paymentMethod === 'CARD'}
                />
              </View>
            )}

            {/* PayPal Option */}
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setFormData({ ...formData, paymentMethod: 'PAYPAL' })}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    formData.paymentMethod === 'PAYPAL' && styles.radioChecked,
                  ]}
                >
                  {formData.paymentMethod === 'PAYPAL' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.paymentOptionText}>Paypal</Text>
              </View>
            </TouchableOpacity>

            {/* Dummy/Test Payment Option */}
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setFormData({ ...formData, paymentMethod: 'DUMMY' })}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    formData.paymentMethod === 'DUMMY' && styles.radioChecked,
                  ]}
                >
                  {formData.paymentMethod === 'DUMMY' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.paymentOptionText}>Test Payment (Dummy)</Text>
              </View>
            </TouchableOpacity>

            {/* Terms */}
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
              <Text style={styles.checkboxLabel}>
                I have read and accept <Text style={styles.linkText}>Terms & Conditions</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.orderSummaryTitle}>Your Order</Text>
          <View style={styles.orderItemsList}>
            {cartItems.map((item) => (
              <View key={item._id} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={2}>
                  {item.name} <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                </Text>
                <Text style={styles.orderItemTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.orderTotals}>
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
            <View style={[styles.totalRow, styles.totalRowMain]}>
              <Text style={styles.totalLabelMain}>Total</Text>
              <Text style={styles.totalValueMain}>${total.toFixed(2)}</Text>
            </View>
          </View>
          <Button
            title={checkoutMutation.isLoading ? 'Processing...' : 'Confirm and Pay'}
            onPress={handleSubmit}
            disabled={!termsAccepted || checkoutMutation.isLoading}
            loading={checkoutMutation.isLoading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  subSection: {
    marginBottom: 24,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginBottom: 0,
  },
  halfInputFirst: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  halfInputLast: {
    flex: 1,
    marginBottom: 0,
    marginRight: 0,
  },
  thirdInput: {
    flex: 1,
    marginBottom: 0,
  },
  thirdInputFirst: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  thirdInputMiddle: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  thirdInputLast: {
    flex: 1,
    marginBottom: 0,
    marginRight: 0,
  },
  existingCustomerLink: {
    marginTop: 8,
  },
  existingCustomerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  textAreaContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentOption: {
    marginBottom: 16,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioChecked: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  paymentOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  paymentDetails: {
    marginLeft: 36,
    marginTop: 12,
    marginBottom: 16,
  },
  orderSummary: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 16,
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  orderItemsList: {
    marginBottom: 20,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginRight: 12,
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  orderTotals: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalRowMain: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.text,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalLabelMain: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  totalValueMain: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  submitButton: {
    marginTop: 20,
  },
  freeShippingText: {
    color: colors.success,
    fontWeight: '600',
  },
  orderItemQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
});

