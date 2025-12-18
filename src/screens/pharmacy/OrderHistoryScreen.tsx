import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';

type OrderHistoryScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

interface Order {
  id: string;
  orderDate: string;
  items: Array<{ name: string; quantity: number; total: string }>;
  total: string;
  status: 'Delivered' | 'Shipped' | 'Processing' | 'Cancelled' | 'Pending';
  deliveryDate?: string;
  trackingNumber?: string;
}

const orders: Order[] = [
  {
    id: 'ORD001',
    orderDate: '15 Nov 2024',
    items: [
      { name: 'Benzaxapine Croplex', quantity: 2, total: '$38' },
      { name: 'Ombinazol Bonibamol', quantity: 1, total: '$22' },
    ],
    total: '$60',
    status: 'Delivered',
    deliveryDate: '18 Nov 2024',
    trackingNumber: 'TRK123456789',
  },
  {
    id: 'ORD002',
    orderDate: '10 Nov 2024',
    items: [
      { name: 'Dantotate Dantodazole', quantity: 3, total: '$30' },
    ],
    total: '$30',
    status: 'Shipped',
    deliveryDate: '20 Nov 2024',
    trackingNumber: 'TRK987654321',
  },
  {
    id: 'ORD003',
    orderDate: '05 Nov 2024',
    items: [
      { name: 'Alispirox Aerorenone', quantity: 1, total: '$26' },
      { name: 'Benzaxapine Croplex', quantity: 1, total: '$19' },
    ],
    total: '$45',
    status: 'Delivered',
    deliveryDate: '08 Nov 2024',
    trackingNumber: 'TRK456789123',
  },
  {
    id: 'ORD004',
    orderDate: '01 Nov 2024',
    items: [
      { name: 'Ombinazol Bonibamol', quantity: 2, total: '$44' },
    ],
    total: '$44',
    status: 'Cancelled',
  },
];

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'Delivered':
      return colors.success;
    case 'Shipped':
      return colors.primary;
    case 'Processing':
      return colors.warning;
    case 'Cancelled':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

export const OrderHistoryScreen = () => {
  const navigation = useNavigation<OrderHistoryScreenNavigationProp>();
  const [filter, setFilter] = useState<'all' | 'delivered' | 'shipped' | 'cancelled'>('all');

  const filteredOrders =
    filter === 'all'
      ? orders
      : orders.filter((order) => order.status.toLowerCase() === filter.toLowerCase());

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <View style={styles.orderDateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.orderDate}>Ordered on {item.orderDate}</Text>
          </View>
          {item.deliveryDate && (
            <View style={styles.orderDateRow}>
              <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.orderDate}>Delivered on {item.deliveryDate}</Text>
            </View>
          )}
        </View>
        <View style={styles.orderStatusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.orderTotal}>Total: {item.total}</Text>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.orderItemsSection}>
        <Text style={styles.orderItemsTitle}>Items:</Text>
        {item.items.map((orderItem, index) => (
          <View key={index} style={styles.orderItemRow}>
            <Text style={styles.orderItemName}>
              {orderItem.name} <Text style={styles.orderItemQuantity}>x{orderItem.quantity}</Text>
            </Text>
            <Text style={styles.orderItemTotal}>{orderItem.total}</Text>
          </View>
        ))}
      </View>

      {/* Tracking Number */}
      {item.trackingNumber && (
        <View style={styles.trackingSection}>
          <Text style={styles.trackingLabel}>Tracking Number: </Text>
          <Text style={styles.trackingNumber}>{item.trackingNumber}</Text>
        </View>
      )}

      {/* Order Actions */}
      <View style={styles.orderActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="download-outline" size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>Download Invoice</Text>
        </TouchableOpacity>
        {item.status === 'Delivered' && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="star-outline" size={16} color={colors.warning} />
            <Text style={styles.actionButtonText}>Rate Order</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'Cancelled' && item.status !== 'Delivered' && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="close-outline" size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Filter Tabs */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'delivered' && styles.filterTabActive]}
            onPress={() => setFilter('delivered')}
          >
            <Text style={[styles.filterTabText, filter === 'delivered' && styles.filterTabTextActive]}>
              Delivered
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'shipped' && styles.filterTabActive]}
            onPress={() => setFilter('shipped')}
          >
            <Text style={[styles.filterTabText, filter === 'shipped' && styles.filterTabTextActive]}>
              Shipped
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'cancelled' && styles.filterTabActive]}
            onPress={() => setFilter('cancelled')}
          >
            <Text style={[styles.filterTabText, filter === 'cancelled' && styles.filterTabTextActive]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <Button
          title="Continue Shopping"
          onPress={() => navigation.navigate('PharmacyHome')}
          variant="outline"
          style={styles.shopButton}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptyText}>You haven't placed any orders yet.</Text>
          <Button
            title="Start Shopping"
            onPress={() => navigation.navigate('PharmacyHome')}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  filterTabs: {
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.textWhite,
  },
  shopButton: {
    marginTop: 8,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  orderStatusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  orderItemsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  orderItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  orderItemQuantity: {
    color: colors.textSecondary,
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trackingSection: {
    marginBottom: 12,
  },
  trackingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  trackingNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
});

