import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

export const CheckoutScreen = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    shipToDifferentAddress: false,
    orderNotes: '',
    paymentMethod: 'credit',
    cardName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const orderItems = [
    { name: 'Safi Natural Blood Purifier Syrup 200 ml Manufactured By Hamdard (Wakf) Laboratories', total: '$200' },
    { name: 'Safi Natural Blood Purifier Syrup 200 ml', total: '$200' },
  ];

  const subtotal = 5877.0;
  const shipping = 25.0;
  const tax = 0.0;
  const total = 160.0;

  const handleSubmit = () => {
    if (termsAccepted) {
      navigation.navigate('PaymentSuccess');
    }
  };

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
            <TouchableOpacity style={styles.existingCustomerLink}>
              <Text style={styles.existingCustomerText}>
                Existing Customer? <Text style={styles.linkText}>Click here to login</Text>
              </Text>
            </TouchableOpacity>
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
            <View style={styles.textAreaContainer}>
              <Text style={styles.label}>Order notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={formData.orderNotes}
                onChangeText={(text) => setFormData({ ...formData, orderNotes: text })}
                placeholder="Enter order notes..."
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
              onPress={() => setFormData({ ...formData, paymentMethod: 'credit' })}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    formData.paymentMethod === 'credit' && styles.radioChecked,
                  ]}
                >
                  {formData.paymentMethod === 'credit' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.paymentOptionText}>Credit card</Text>
              </View>
            </TouchableOpacity>

            {formData.paymentMethod === 'credit' && (
              <View style={styles.paymentDetails}>
                <Input
                  label="Name on Card"
                  value={formData.cardName}
                  onChangeText={(text) => setFormData({ ...formData, cardName: text })}
                  placeholder="Enter name"
                />
                <Input
                  label="Card Number"
                  value={formData.cardNumber}
                  onChangeText={(text) => setFormData({ ...formData, cardNumber: text })}
                  placeholder="1234 5678 9876 5432"
                  keyboardType="numeric"
                />
                <Input
                  label="Expiry Month"
                  value={formData.expiryMonth}
                  onChangeText={(text) => setFormData({ ...formData, expiryMonth: text })}
                  placeholder="MM"
                  keyboardType="numeric"
                />
                <Input
                  label="Expiry Year"
                  value={formData.expiryYear}
                  onChangeText={(text) => setFormData({ ...formData, expiryYear: text })}
                  placeholder="YY"
                  keyboardType="numeric"
                />
                <Input
                  label="CVV"
                  value={formData.cvv}
                  onChangeText={(text) => setFormData({ ...formData, cvv: text })}
                  placeholder="CVV"
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            )}

            {/* PayPal Option */}
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => setFormData({ ...formData, paymentMethod: 'paypal' })}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    formData.paymentMethod === 'paypal' && styles.radioChecked,
                  ]}
                >
                  {formData.paymentMethod === 'paypal' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.paymentOptionText}>Paypal</Text>
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
            {orderItems.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.orderItemTotal}>{item.total}</Text>
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
              <Text style={styles.totalValue}>${shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowMain]}>
              <Text style={styles.totalLabelMain}>Total</Text>
              <Text style={styles.totalValueMain}>${total.toFixed(2)}</Text>
            </View>
          </View>
          <Button
            title="Confirm and Pay"
            onPress={handleSubmit}
            disabled={!termsAccepted}
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
});

