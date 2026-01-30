import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList, MoreStackParamList } from '../../navigation/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as orderApi from '../../services/order';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/common/Button';

type OrderDetailsScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<PharmacyStackParamList | MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;
type OrderDetailsScreenRouteProp = RouteProp<PharmacyStackParamList, 'OrderDetails'>;

const defaultAvatar = require('../../../assets/avatar.png');

const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') return null;
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) return null;
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
    if (normalizedUrl.includes('localhost')) normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    if (normalizedUrl.includes('127.0.0.1')) normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    return normalizedUrl;
  }
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getStatusBadgeColor = (status: orderApi.Order['status']) => {
  switch (status) {
    case 'DELIVERED':
      return colors.success;
    case 'SHIPPED':
      return colors.info;
    case 'PROCESSING':
    case 'CONFIRMED':
      return colors.primary;
    case 'PENDING':
      return colors.warning;
    case 'CANCELLED':
    case 'REFUNDED':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

export const OrderDetailsScreen = () => {
  const navigation = useNavigation<OrderDetailsScreenNavigationProp>();
  const route = useRoute<OrderDetailsScreenRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAYPAL' | 'DUMMY'>('DUMMY');

  const { data: orderResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrderById(orderId),
    enabled: !!orderId,
  });

  const order = orderResponse?.data;

  const payMutation = useMutation({
    mutationFn: () => orderApi.payForOrder(orderId, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['patientOrders']);
      Toast.show({
        type: 'success',
        text1: 'Payment Successful',
        text2: 'Your order payment has been processed!',
      });
      refetch();
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: err.response?.data?.message || err.message || 'Please try again.',
      });
    },
  });

  const handlePay = () => {
    if (!order) return;

    const amountToPay = order.requiresPaymentUpdate && order.initialTotal
      ? order.total - order.initialTotal
      : order.total;

    Alert.alert(
      'Confirm Payment',
      `Pay ${formatCurrency(amountToPay)} for this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: () => payMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Error Loading Order</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load order details'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pharmacy = typeof order.pharmacyId === 'object' ? order.pharmacyId : null;
  const pharmacyName = pharmacy?.name || 'Pharmacy';
  const shippingAddress = order.shippingAddress;
  
  // Show payment button if order is pending and shipping fee is set
  const showPaymentButton = order.paymentStatus === 'PENDING' && 
                            order.finalShipping !== null && 
                            order.finalShipping !== undefined;
  
  // Calculate amount to pay
  const amountToPay = order.requiresPaymentUpdate && order.initialTotal
    ? order.total - order.initialTotal
    : order.total;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.header}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumberLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusBadgeColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </View>

        {/* Payment Status Alert */}
        {order.requiresPaymentUpdate && (
          <View style={styles.alertContainer}>
            <Ionicons name="information-circle" size={24} color={colors.warning} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Shipping Fee Updated</Text>
              <Text style={styles.alertText}>
                The shipping fee has been updated. Please pay the additional{' '}
                {formatCurrency(amountToPay)} to proceed.
              </Text>
            </View>
          </View>
        )}
        {/* Alert if shipping fee is not set yet */}
        {(order.finalShipping === null || order.finalShipping === undefined) && (
          <View style={[styles.alertContainer, { borderLeftColor: colors.info || colors.primary }]}>
            <Ionicons name="information-circle" size={24} color={colors.info || colors.primary} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Waiting for Shipping Fee</Text>
              <Text style={styles.alertText}>
                The pharmacy owner is setting the shipping fee. You will be able to pay once the shipping fee is confirmed.
              </Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => {
            const product = typeof item.productId === 'object' ? item.productId : null;
            const productName = product?.name || 'Product';
            const productImage = product?.images?.[0];
            const normalizedImageUrl = normalizeImageUrl(productImage);
            const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
            const itemPrice = item.discountPrice || item.price;

            return (
              <View key={index} style={styles.orderItem}>
                <Image source={imageSource} style={styles.productImage} defaultSource={defaultAvatar} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{productName}</Text>
                  <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(itemPrice)} each</Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Shipping Address */}
        {shippingAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressContainer}>
              <Text style={styles.addressLine}>{shippingAddress.line1}</Text>
              {shippingAddress.line2 && (
                <Text style={styles.addressLine}>{shippingAddress.line2}</Text>
              )}
              <Text style={styles.addressLine}>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
              </Text>
              <Text style={styles.addressLine}>{shippingAddress.country}</Text>
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.tax)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Shipping</Text>
              {order.finalShipping !== null && order.finalShipping !== order.initialShipping && (
                <Text style={styles.shippingNote}>
                  Updated from {formatCurrency(order.initialShipping || 0)}
                </Text>
              )}
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(order.shipping)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
          {order.requiresPaymentUpdate && order.initialTotal && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Already Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.initialTotal)}</Text>
            </View>
          )}
          {order.requiresPaymentUpdate && (
            <View style={[styles.summaryRow, styles.amountDueRow]}>
              <Text style={styles.amountDueLabel}>Amount Due</Text>
              <Text style={styles.amountDueValue}>{formatCurrency(amountToPay)}</Text>
            </View>
          )}
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pharmacy</Text>
            <Text style={styles.infoValue}>{pharmacyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          {order.deliveredAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivered Date</Text>
              <Text style={styles.infoValue}>{formatDate(order.deliveredAt)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text
              style={[
                styles.infoValue,
                order.paymentStatus === 'PAID' && { color: colors.success },
                order.paymentStatus === 'PARTIAL' && { color: colors.warning },
              ]}
            >
              {order.paymentStatus}
            </Text>
          </View>
        </View>

        {/* Payment Button */}
        {showPaymentButton && (
          <View style={styles.paymentSection}>
            <View style={styles.paymentInfoContainer}>
              <Text style={styles.paymentInfoTitle}>Total Amount to Pay</Text>
              <Text style={styles.paymentInfoAmount}>{formatCurrency(order.total)}</Text>
              {order.initialTotal && order.initialTotal !== order.total && (
                <Text style={styles.paymentInfoNote}>
                  Updated from initial estimate of {formatCurrency(order.initialTotal)}
                </Text>
              )}
            </View>
            <Button
              title={payMutation.isLoading ? 'Processing Payment...' : `Pay Now - ${formatCurrency(order.total)}`}
              onPress={handlePay}
              disabled={payMutation.isLoading}
              loading={payMutation.isLoading}
              style={styles.payButton}
            />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderNumberLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight || colors.background,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productImage: {
    width: 60,
    height: 60,
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
  itemQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.textLight,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  addressContainer: {
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
  },
  addressLine: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  shippingNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  amountDueRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.warning,
    backgroundColor: colors.warningLight || colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
  },
  amountDueLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
  },
  amountDueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warning,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  paymentSection: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  paymentInfoContainer: {
    backgroundColor: colors.primaryLight || colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  paymentInfoAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  paymentInfoNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  payButton: {
    width: '100%',
  },
});

