import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type CheckoutScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'Checkout'>;

const CheckoutScreen = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);

  const bookingSummary = {
    doctor: 'Dr. Darren Elder',
    doctorImg: 'https://via.placeholder.com/150',
    date: '14 Nov 2023',
    time: '10:00 AM',
    consultingFee: 100,
    bookingFee: 10,
    onlineConsultation: 50,
    total: 160,
  };

  const handleSubmit = () => {
    if (!acceptTerms) {
      // Show error
      return;
    }
    navigation.navigate('BookingSuccess');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor={colors.textLight}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor={colors.textLight}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.existingCustomer} activeOpacity={0.7}>
            <Text style={styles.existingCustomerText}>
              Existing Customer? <Text style={styles.loginLink}>Click here to login</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {/* Credit Card Option */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('card')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentRadio}>
              <View style={[styles.radio, paymentMethod === 'card' && styles.radioActive]}>
                {paymentMethod === 'card' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.paymentLabel}>Credit card</Text>
            </View>
          </TouchableOpacity>

          {paymentMethod === 'card' && (
            <View style={styles.cardForm}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Name on Card</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textLight}
                    value={formData.cardName}
                    onChangeText={(text) => setFormData({ ...formData, cardName: text })}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9876 5432"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    value={formData.cardNumber}
                    onChangeText={(text) => setFormData({ ...formData, cardNumber: text })}
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Expiry Month</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={formData.expiryMonth}
                    onChangeText={(text) => setFormData({ ...formData, expiryMonth: text })}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Expiry Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YY"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={formData.expiryYear}
                    onChangeText={(text) => setFormData({ ...formData, expiryYear: text })}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="CVV"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                    value={formData.cvv}
                    onChangeText={(text) => setFormData({ ...formData, cvv: text })}
                  />
                </View>
              </View>
            </View>
          )}

          {/* PayPal Option */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'paypal' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('paypal')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentRadio}>
              <View style={[styles.radio, paymentMethod === 'paypal' && styles.radioActive]}>
                {paymentMethod === 'paypal' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.paymentLabel}>Paypal</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
              {acceptTerms && <Ionicons name="checkmark" size={14} color={colors.textWhite} />}
            </View>
            <Text style={styles.termsText}>
              I have read and accept <Text style={styles.termsLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.submitBtnText}>Confirm and Pay</Text>
        </TouchableOpacity>
      </ScrollView>

        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryDoctor}>
            <Image source={{ uri: bookingSummary.doctorImg }} style={styles.summaryDoctorImage} />
            <View style={styles.summaryDoctorInfo}>
              <Text style={styles.summaryDoctorName}>{bookingSummary.doctor}</Text>
              <View style={styles.summaryRating}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons key={i} name={i <= 4 ? "star" : "star-outline"} size={12} color="#FFB800" />
                ))}
                <Text style={styles.summaryRatingText}>(35)</Text>
              </View>
              <View style={styles.summaryLocation}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.summaryLocationText}>Newyork, USA</Text>
              </View>
            </View>
          </View>
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{bookingSummary.date}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{bookingSummary.time}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consulting Fee</Text>
              <Text style={styles.summaryValue}>${bookingSummary.consultingFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking Fee</Text>
              <Text style={styles.summaryValue}>${bookingSummary.bookingFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Online Consultation</Text>
              <Text style={styles.summaryValue}>${bookingSummary.onlineConsultation}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>${bookingSummary.total}</Text>
            </View>
          </View>
        </View>
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
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  existingCustomer: {
    marginTop: 8,
  },
  existingCustomerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  paymentOption: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  paymentRadio: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  cardForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: colors.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryDoctor: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryDoctorImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  summaryDoctorInfo: {
    flex: 1,
  },
  summaryDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  summaryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryRatingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  summaryLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default CheckoutScreen;

