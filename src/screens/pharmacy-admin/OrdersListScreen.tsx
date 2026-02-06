import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { OrdersStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as orderApi from '../../services/order';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';
import { Button } from '../../components/common/Button';

type OrdersListScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList>;

const statusFilters: Array<{ label: string; value?: orderApi.Order['status'] }> = [
  { label: 'All' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export const OrdersListScreen = () => {
  const navigation = useNavigation<OrdersListScreenNavigationProp>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(statusFilters[0]);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?._id || user?.id;
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyUser = isPharmacy || isParapharmacy;
  const requiresSubscription = isPharmacy;

  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-pharmacy-subscription', userId],
    queryFn: () => pharmacySubscriptionApi.getMyPharmacySubscription(),
    enabled: !!userId && requiresSubscription,
    retry: 1,
  });

  const subscriptionData = useMemo(() => {
    if (!subscriptionResponse) return null;
    const r: any = subscriptionResponse as any;
    const data = r?.data ?? r;
    return data?.data ?? data;
  }, [subscriptionResponse]);

  const hasActiveSubscription = useMemo(() => {
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

  const getStatusColor = (status: orderApi.Order['status']) => {
    switch (status) {
      case 'PENDING':
        return colors.warning;
      case 'CONFIRMED':
      case 'PROCESSING':
        return colors.primary;
      case 'SHIPPED':
        return colors.info;
      case 'DELIVERED':
        return colors.success;
      case 'CANCELLED':
      case 'REFUNDED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['pharmacyOrders', selectedFilter.value || 'ALL', userId],
    queryFn: () =>
      orderApi.getPharmacyOrders({
        status: selectedFilter.value,
        page: 1,
        limit: 200,
      }),
    enabled: !!userId && isPharmacyUser && hasActiveSubscription,
    retry: 1,
  });

  const orders = useMemo(() => {
    return ordersResponse?.data?.orders || [];
  }, [ordersResponse]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const patient = typeof order.patientId === 'object' ? order.patientId : null;
      const customerName = (patient?.fullName || '').toLowerCase();
      const customerEmail = (patient?.email || '').toLowerCase();
      const orderNumber = (order.orderNumber || '').toLowerCase();
      return orderNumber.includes(q) || customerName.includes(q) || customerEmail.includes(q);
    });
  }, [orders, searchQuery]);

  const handleViewOrder = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderOrder = ({ item }: { item: orderApi.Order }) => {
    const patient = typeof item.patientId === 'object' ? item.patientId : null;
    const customerName = patient?.fullName || 'Customer';
    const customerEmail = patient?.email || '';
    const itemCount = item.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0;

    return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleViewOrder(item._id)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.customerRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.customerName}>{customerName}</Text>
        </View>
        <View style={styles.customerRow}>
          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.customerEmail}>{customerEmail}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Items:</Text>
          <Text style={styles.footerValue}>{itemCount}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total:</Text>
          <Text style={styles.footerTotal}>{formatCurrency(item.total)}</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {requiresSubscription && subscriptionLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      ) : requiresSubscription && !hasActiveSubscription ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={colors.warning} />
          <Text style={styles.emptyStateTitle}>Subscription Required</Text>
          <Text style={styles.emptyStateText}>You need an active subscription to manage orders.</Text>
          <View style={{ width: '100%', marginTop: 16 }}>
            <Button title="View Subscription Plans" onPress={goToSubscription} />
          </View>
        </View>
      ) : (
        <>
          {!isPharmacyUser ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>Orders</Text>
              <Text style={styles.emptyStateText}>This section is available for pharmacy accounts only.</Text>
            </View>
          ) : isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
              <Text style={styles.emptyStateTitle}>Error loading orders</Text>
              <Text style={styles.emptyStateText}>{(error as any)?.message || 'Please try again'}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search orders..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Status Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
              >
                {statusFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.label}
                    style={[
                      styles.filterChip,
                      selectedFilter.label === filter.label && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter.label === filter.label && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Orders List */}
              <FlatList
                data={filteredOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
                    <Text style={styles.emptyStateTitle}>No orders found</Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery || selectedFilter.label !== 'All'
                        ? 'Try adjusting your filters'
                        : 'No orders have been placed yet'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filtersContainer: {
    marginBottom: 12,
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: colors.textWhite,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: colors.text,
  },
  customerEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  footerTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
});

