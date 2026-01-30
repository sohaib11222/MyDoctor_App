import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as orderApi from '../../services/order';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';

type OrderDetailsScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderDetails'>;
type OrderDetailsRouteProp = RouteProp<OrdersStackParamList, 'OrderDetails'>;

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

const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '€0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
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
  const route = useRoute<OrderDetailsRouteProp>();
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingFee, setShippingFee] = useState('');

  // Fetch order data
  const { data: orderResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrderById(orderId),
    retry: 1,
  });

  const order = orderResponse?.data;

  // Update shipping fee mutation
  const updateShippingFeeMutation = useMutation({
    mutationFn: ({ orderId, shippingFee }: { orderId: string; shippingFee: number }) =>
      orderApi.updateShippingFee(orderId, shippingFee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      setShowShippingModal(false);
      setShippingFee('');
      Toast.show({
        type: 'success',
        text1: 'Shipping fee updated successfully!',
      });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update shipping fee',
        text2: err.message || 'Please try again.',
      });
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: orderApi.Order['status'] }) =>
      orderApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      Toast.show({
        type: 'success',
        text1: 'Order status updated successfully!',
      });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update order status',
        text2: err.message || 'Please try again.',
      });
    },
  });

  const handleOpenShippingModal = () => {
    if (!order) return;
    setShippingFee((order.shipping?.toString() || order.initialShipping?.toString() || '0'));
    setShowShippingModal(true);
  };

  const handleUpdateShippingFee = () => {
    if (!order) return;
    const fee = parseFloat(shippingFee);
    if (isNaN(fee) || fee < 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid shipping fee',
        text2: 'Please enter a valid non-negative number',
      });
      return;
    }
    updateShippingFeeMutation.mutate({ orderId: order._id, shippingFee: fee });
  };

  const handleUpdateStatus = () => {
    navigation.navigate('OrderStatus', { orderId });
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

  const patient = typeof order.patientId === 'object' ? order.patientId : null;
  const patientName = patient?.fullName || 'Unknown Patient';
  const patientEmail = patient?.email || '—';
  const patientPhone = patient?.phone || '—';
  const shippingAddress = order.shippingAddress;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderDate}>Order Date: {formatDate(order.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(order.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusBadgeColor(order.status) }]}>
                {order.status}
              </Text>
            </View>
          </View>
          <View style={styles.paymentStatusContainer}>
            <Text style={styles.paymentStatusLabel}>Payment:</Text>
            <View style={[styles.paymentStatusBadge, {
              backgroundColor: order.paymentStatus === 'PAID' ? colors.success + '20' : colors.warning + '20'
            }]}>
              <Text style={[styles.paymentStatusText, {
                color: order.paymentStatus === 'PAID' ? colors.success : colors.warning
              }]}>
                {order.paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{patientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{patientEmail}</Text>
          </View>
          {patientPhone !== '—' && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{patientPhone}</Text>
            </View>
          )}
        </View>

        {/* Shipping Address */}
        {shippingAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <View style={styles.addressContainer}>
                <Text style={styles.infoText}>{shippingAddress.line1}</Text>
                {shippingAddress.line2 && <Text style={styles.infoText}>{shippingAddress.line2}</Text>}
                <Text style={styles.infoText}>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                </Text>
                <Text style={styles.infoText}>{shippingAddress.country}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({order.items?.length || 0})</Text>
          {order.items?.map((item, index) => {
            const product = typeof item.productId === 'object' ? item.productId : null;
            const productName = product?.name || 'Product';
            const productImage = product?.images?.[0];
            const normalizedImageUrl = normalizeImageUrl(productImage);
            const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
            const itemPrice = item.discountPrice || item.price;

            return (
              <View key={index} style={styles.orderItem}>
                <Image source={imageSource} style={styles.itemImage} defaultSource={defaultAvatar} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{productName}</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>{formatCurrency(itemPrice)} each</Text>
                  </View>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Shipping</Text>
              {order.finalShipping !== null && order.finalShipping !== order.initialShipping && (
                <Text style={styles.shippingNote}>
                  Updated from {formatCurrency(order.initialShipping || 0)}
                </Text>
              )}
              {order.shippingUpdatedAt && (
                <Text style={styles.shippingNote}>
                  Updated on {formatDate(order.shippingUpdatedAt)}
                </Text>
              )}
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(order.shipping)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.tax)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {/* Allow setting shipping fee if order is not paid yet */}
        {order.paymentStatus === 'PENDING' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shippingButton]}
            onPress={handleOpenShippingModal}
            disabled={updateShippingFeeMutation.isPending}
          >
            <Ionicons name="car-outline" size={20} color={colors.textWhite} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>
              {order.finalShipping !== null && order.finalShipping !== undefined
                ? 'Update Shipping Fee'
                : 'Set Shipping Fee'}
            </Text>
          </TouchableOpacity>
        )}
        {/* Only allow updating status if order is paid */}
        {order.paymentStatus === 'PAID' && 
         ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={handleUpdateStatus}
            disabled={updateStatusMutation.isPending}
          >
            <Ionicons name="create-outline" size={20} color={colors.textWhite} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Shipping Fee Update Modal */}
      <Modal
        visible={showShippingModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowShippingModal(false);
          setShippingFee('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Shipping Fee</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowShippingModal(false);
                  setShippingFee('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalOrderNumber}>
                Order #{order.orderNumber}
              </Text>
              <Text style={styles.modalLabel}>Set the final shipping fee:</Text>
              
              <View style={styles.shippingInfoContainer}>
                <Text style={styles.shippingInfoLabel}>Current Shipping Fee:</Text>
                <Text style={styles.shippingInfoValue}>
                  {formatCurrency(order.shipping || order.initialShipping || 0)}
                </Text>
                {order.initialShipping != null && order.initialShipping !== order.shipping && (
                  <Text style={styles.shippingInfoNote}>
                    Initial estimate: {formatCurrency(order.initialShipping)}
                  </Text>
                )}
              </View>

              <View style={styles.shippingInputContainer}>
                <Text style={styles.modalLabel}>New Shipping Fee:</Text>
                <TextInput
                  style={styles.shippingInput}
                  placeholder="Enter shipping fee"
                  placeholderTextColor={colors.textLight}
                  value={shippingFee}
                  onChangeText={setShippingFee}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.modalNote}>
                  Subtotal: {formatCurrency(order.subtotal || 0)}{' '}
                  + Tax: {formatCurrency(order.tax || 0)}{' '}
                  + Shipping = New Total
                </Text>
              </View>

              {shippingFee && !isNaN(parseFloat(shippingFee)) && order && (
                <View style={styles.newTotalContainer}>
                  <Text style={styles.newTotalLabel}>New Total:</Text>
                  <Text style={styles.newTotalValue}>
                    {formatCurrency((order.subtotal || 0) + (order.tax || 0) + parseFloat(shippingFee))}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowShippingModal(false);
                  setShippingFee('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleUpdateShippingFee}
                disabled={updateShippingFeeMutation.isPending || !shippingFee || isNaN(parseFloat(shippingFee))}
              >
                {updateShippingFeeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Update Shipping Fee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  summarySection: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  shippingButton: {
    backgroundColor: colors.warning,
  },
  updateButton: {
    backgroundColor: colors.success,
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paymentStatusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressContainer: {
    flex: 1,
  },
  shippingNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  shippingInfoContainer: {
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  shippingInfoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  shippingInfoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  shippingInfoNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  shippingInputContainer: {
    marginTop: 16,
  },
  shippingInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  modalNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  newTotalContainer: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  newTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

