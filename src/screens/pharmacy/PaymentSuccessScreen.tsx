import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import * as orderApi from '../../services/order';

type PaymentSuccessScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;
type PaymentSuccessScreenRouteProp = RouteProp<PharmacyStackParamList, 'PaymentSuccess'>;

export const PaymentSuccessScreen = () => {
  const navigation = useNavigation<PaymentSuccessScreenNavigationProp>();
  const route = useRoute<PaymentSuccessScreenRouteProp>();
  const { orderId } = route.params || {};

  // Fetch order details if orderId is provided
  const { data: orderResponse } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const orderNumber = orderResponse?.data?.orderNumber || 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Payment Successfully!</Text>
          <Text style={styles.productId}>Order Number: {orderNumber}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            title="View Order History"
            onPress={() => navigation.navigate('OrderHistory')}
            style={styles.actionButton}
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PharmacyHome')}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
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
    padding: 20,
  },
  successCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  productId: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  actionButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

