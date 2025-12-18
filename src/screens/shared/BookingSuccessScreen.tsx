import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type BookingSuccessScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'BookingSuccess'>;

const BookingSuccessScreen = () => {
  const navigation = useNavigation<BookingSuccessScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.title}>Appointment booked Successfully!</Text>
          <Text style={styles.message}>
            Appointment booked with <Text style={styles.boldText}>Dr. Darren Elder</Text>
            {'\n'}on <Text style={styles.boldText}>12 Nov 2023 5:00PM to 6:00PM</Text>
          </Text>
          <TouchableOpacity
            style={styles.viewInvoiceBtn}
            onPress={() => {
              // Navigate to invoice view
              navigation.navigate('AppointmentsScreen');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.viewInvoiceText}>View Invoice</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  successCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  boldText: {
    fontWeight: '600',
    color: colors.text,
  },
  viewInvoiceBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  viewInvoiceText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingSuccessScreen;

