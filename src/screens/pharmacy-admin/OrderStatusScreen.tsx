import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as orderApi from '../../services/order';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';

type OrderStatusScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderStatus'>;
type OrderStatusRouteProp = RouteProp<OrdersStackParamList, 'OrderStatus'>;

const statusOptions: { value: orderApi.Order['status']; label: string; icon: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', icon: 'time-outline', color: colors.warning },
  { value: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-outline', color: colors.primary },
  { value: 'PROCESSING', label: 'Processing', icon: 'sync-outline', color: colors.primary },
  { value: 'SHIPPED', label: 'Shipped', icon: 'car-outline', color: colors.info },
  { value: 'DELIVERED', label: 'Delivered', icon: 'checkmark-circle-outline', color: colors.success },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle-outline', color: colors.error },
  { value: 'REFUNDED', label: 'Refunded', icon: 'cash-outline', color: colors.error },
];

export const OrderStatusScreen = () => {
  const navigation = useNavigation<OrderStatusScreenNavigationProp>();
  const route = useRoute<OrderStatusRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyUser = isPharmacy || isParapharmacy;
  const userId = user?._id || user?.id;

  const requiresSubscription = isPharmacy;

  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-pharmacy-subscription', userId],
    queryFn: () => pharmacySubscriptionApi.getMyPharmacySubscription(),
    enabled: !!userId && requiresSubscription,
    retry: 1,
  });

  const subscriptionData = React.useMemo(() => {
    if (!subscriptionResponse) return null;
    const r: any = subscriptionResponse as any;
    const data = r?.data ?? r;
    return data?.data ?? data;
  }, [subscriptionResponse]);

  const hasActiveSubscription = React.useMemo(() => {
    if (!requiresSubscription) return true;
    if (!subscriptionData) return false;
    if (subscriptionData?.hasActiveSubscription === true) return true;
    if (subscriptionData?.subscriptionExpiresAt) return new Date(subscriptionData.subscriptionExpiresAt) > new Date();
    return false;
  }, [subscriptionData]);

  const goToSubscription = () => {
    const parent = (navigation as any).getParent?.();
    if (parent) {
      parent.navigate('More', { screen: 'PharmacySubscription' });
    } else {
      (navigation as any).navigate('More', { screen: 'PharmacySubscription' });
    }
  };

  const { data: orderResponse, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrderById(orderId),
    enabled: !!orderId && isPharmacyUser,
    retry: 1,
  });

  const order = orderResponse?.data;
  const [selectedStatus, setSelectedStatus] = useState<orderApi.Order['status']>('PENDING');

  React.useEffect(() => {
    if (order?.status) {
      setSelectedStatus(order.status);
    }
  }, [order?.status]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: orderApi.Order['status']) => orderApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      Toast.show({ type: 'success', text1: 'Order status updated' });
      navigation.goBack();
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update status',
        text2: err?.response?.data?.message || err?.message || 'Please try again',
      });
    },
  });

  const handleUpdateStatus = () => {
    if (!order) return;
    if (selectedStatus === order.status) {
      Alert.alert('No Change', 'Please select a different status.');
      return;
    }

    updateStatusMutation.mutate(selectedStatus);
  };

  const getStatusDescription = (status: orderApi.Order['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Order has been placed and is awaiting processing.';
      case 'CONFIRMED':
        return 'Order has been confirmed and will be processed.';
      case 'PROCESSING':
        return 'Order is being prepared and will be shipped soon.';
      case 'SHIPPED':
        return 'Order has been shipped and is on its way to the customer.';
      case 'DELIVERED':
        return 'Order has been successfully delivered to the customer.';
      case 'CANCELLED':
        return 'Order has been cancelled.';
      case 'REFUNDED':
        return 'Order has been refunded.';
      default:
        return '';
    }
  };

  if (!isPharmacyUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>This screen is available for pharmacy accounts only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="card-outline" size={48} color={colors.warning} />
          <Text style={styles.loadingText}>Subscription required to update order status.</Text>
          <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 16 }}>
            <Button title="View Subscription Plans" onPress={goToSubscription} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>{(error as any)?.message || 'Failed to load order'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={styles.currentStatusContainer}>
            <Text style={styles.currentStatusLabel}>Current Status:</Text>
            <View
              style={[
                styles.currentStatusBadge,
                {
                  backgroundColor: `${statusOptions.find((s) => s.value === order.status)?.color}20`,
                },
              ]}
            >
              <Text
                style={[
                  styles.currentStatusText,
                  { color: statusOptions.find((s) => s.value === order.status)?.color },
                ]}
              >
                {order.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Status</Text>
          <Text style={styles.sectionDescription}>
            Choose the new status for this order. The customer will be notified of the status change.
          </Text>

          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusOption,
                selectedStatus === status.value && styles.statusOptionSelected,
              ]}
              onPress={() => setSelectedStatus(status.value)}
              activeOpacity={0.7}
            >
              <View style={styles.statusOptionContent}>
                <View
                  style={[
                    styles.statusIconContainer,
                    { backgroundColor: `${status.color}20` },
                  ]}
                >
                  <Ionicons name={status.icon as any} size={24} color={status.color} />
                </View>
                <View style={styles.statusOptionInfo}>
                  <Text
                    style={[
                      styles.statusOptionLabel,
                      selectedStatus === status.value && styles.statusOptionLabelSelected,
                    ]}
                  >
                    {status.label}
                  </Text>
                  <Text style={styles.statusOptionDescription}>
                    {getStatusDescription(status.value)}
                  </Text>
                </View>
              </View>
              {selectedStatus === status.value && (
                <Ionicons name="checkmark-circle" size={24} color={status.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Warning for Cancelled */}
        {selectedStatus === 'CANCELLED' && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning-outline" size={24} color={colors.error} />
            <Text style={styles.warningText}>
              Cancelling an order will notify the customer and may require a refund. Please confirm this action.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        <Button
          title="Update Status"
          onPress={handleUpdateStatus}
          loading={updateStatusMutation.isPending}
          disabled={selectedStatus === order.status || updateStatusMutation.isPending}
          style={styles.updateButton}
        />
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  currentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentStatusText: {
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  statusOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusOptionInfo: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  statusOptionLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  statusOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.error}20`,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  updateButton: {
    width: '100%',
  },
});

