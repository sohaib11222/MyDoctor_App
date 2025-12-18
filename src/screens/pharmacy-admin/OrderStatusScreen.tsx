import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type OrderStatusScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderStatus'>;
type OrderStatusRouteProp = RouteProp<OrdersStackParamList, 'OrderStatus'>;

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

const statusOptions: { value: OrderStatus; label: string; icon: string; color: string }[] = [
  { value: 'Pending', label: 'Pending', icon: 'time-outline', color: colors.warning },
  { value: 'Processing', label: 'Processing', icon: 'sync-outline', color: colors.primary },
  { value: 'Shipped', label: 'Shipped', icon: 'car-outline', color: colors.info },
  { value: 'Delivered', label: 'Delivered', icon: 'checkmark-circle-outline', color: colors.success },
  { value: 'Cancelled', label: 'Cancelled', icon: 'close-circle-outline', color: colors.error },
];

export const OrderStatusScreen = () => {
  const navigation = useNavigation<OrderStatusScreenNavigationProp>();
  const route = useRoute<OrderStatusRouteProp>();
  const { orderId } = route.params;
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('Pending');
  const [loading, setLoading] = useState(false);

  // Mock order data - in real app, fetch based on orderId
  const order = {
    id: orderId,
    orderNumber: 'ORD-2024-001',
    currentStatus: 'Pending' as OrderStatus,
  };

  const handleUpdateStatus = () => {
    if (selectedStatus === order.currentStatus) {
      Alert.alert('No Change', 'Please select a different status.');
      return;
    }

    setLoading(true);
    // TODO: Update order status via API
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Success',
        `Order status updated to ${selectedStatus}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }, 2000);
  };

  const getStatusDescription = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'Order has been placed and is awaiting processing.';
      case 'Processing':
        return 'Order is being prepared and will be shipped soon.';
      case 'Shipped':
        return 'Order has been shipped and is on its way to the customer.';
      case 'Delivered':
        return 'Order has been successfully delivered to the customer.';
      case 'Cancelled':
        return 'Order has been cancelled.';
      default:
        return '';
    }
  };

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
                  backgroundColor: `${statusOptions.find((s) => s.value === order.currentStatus)?.color}20`,
                },
              ]}
            >
              <Text
                style={[
                  styles.currentStatusText,
                  { color: statusOptions.find((s) => s.value === order.currentStatus)?.color },
                ]}
              >
                {order.currentStatus}
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
        {selectedStatus === 'Cancelled' && (
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
          loading={loading}
          disabled={selectedStatus === order.currentStatus}
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

