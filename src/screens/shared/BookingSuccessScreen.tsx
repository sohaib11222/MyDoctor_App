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
import { useTranslation } from 'react-i18next';

type BookingSuccessScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'BookingSuccess'>;

const BookingSuccessScreen = () => {
  const navigation = useNavigation<BookingSuccessScreenNavigationProp>();
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.toLowerCase().startsWith('it') ? 'it-IT' : 'en-US';
  const formatDateTimeRangeFallback = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const dateLabel = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(start);

    const startTime = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start);

    const endTime = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end);

    return `${dateLabel} ${startTime} - ${endTime}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.title}>{t('appointments.bookingSuccess.title')}</Text>
          <Text style={styles.message}>
            {t('appointments.bookingSuccess.messagePrefix')}{' '}
            <Text style={styles.boldText}>{t('appointments.bookingSuccess.doctorNameFallback')}</Text>
            {'\n'}
            {t('appointments.bookingSuccess.messageOn')}{' '}
            <Text style={styles.boldText}>{formatDateTimeRangeFallback()}</Text>
          </Text>
          <TouchableOpacity
            style={styles.viewInvoiceBtn}
            onPress={() => {
              try {
                const parent = (navigation as any).getParent?.();
                if (parent) {
                  parent.navigate('Appointments', { screen: 'AppointmentsScreen' });
                  return;
                }
              } catch {
                // ignore
              }

              navigation.navigate('AppointmentsScreen');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.viewInvoiceText}>{t('appointments.bookingSuccess.viewInvoice')}</Text>
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

