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
import { useTranslation } from 'react-i18next';

type OrdersListScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList>;

export const OrdersListScreen = () => {
  const navigation = useNavigation<OrdersListScreenNavigationProp>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | orderApi.Order['status']>('ALL');
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

  const statusFilters = useMemo(
    () => [
      { key: 'ALL' as const, value: undefined, label: t('pharmacyAdmin.orders.filters.all') },
      { key: 'PENDING' as const, value: 'PENDING' as const, label: t('pharmacyAdmin.orders.filters.pending') },
      { key: 'CONFIRMED' as const, value: 'CONFIRMED' as const, label: t('pharmacyAdmin.orders.filters.confirmed') },
      { key: 'PROCESSING' as const, value: 'PROCESSING' as const, label: t('pharmacyAdmin.orders.filters.processing') },
      { key: 'SHIPPED' as const, value: 'SHIPPED' as const, label: t('pharmacyAdmin.orders.filters.shipped') },
      { key: 'DELIVERED' as const, value: 'DELIVERED' as const, label: t('pharmacyAdmin.orders.filters.delivered') },
      { key: 'CANCELLED' as const, value: 'CANCELLED' as const, label: t('pharmacyAdmin.orders.filters.cancelled') },
      { key: 'REFUNDED' as const, value: 'REFUNDED' as const, label: t('pharmacyAdmin.orders.filters.refunded') },
    ],
    [t]
  );

  const selectedFilter = useMemo(() => {
    return statusFilters.find((f) => f.key === selectedStatus) || statusFilters[0];
  }, [selectedStatus, statusFilters]);

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
    return date.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['pharmacyOrders', selectedStatus, userId],
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
    const customerName = patient?.fullName || t('pharmacyAdmin.common.customer');
    const customerEmail = patient?.email || '';
    const itemCount = item.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0;

    const statusLabel = t(`pharmacy.checkout.orders.status.${item.status}` as any, { defaultValue: item.status });

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
            {statusLabel}
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
          <Text style={styles.footerLabel}>{t('pharmacyAdmin.orders.labels.items')}</Text>
          <Text style={styles.footerValue}>{itemCount}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>{t('pharmacyAdmin.orders.labels.total')}</Text>
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
          <Text style={styles.loadingText}>{t('pharmacyAdmin.dashboard.banners.loadingSubscription')}</Text>
        </View>
      ) : requiresSubscription && !hasActiveSubscription ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={colors.warning} />
          <Text style={styles.emptyStateTitle}>{t('pharmacyAdmin.orders.subscriptionRequired.title')}</Text>
          <Text style={styles.emptyStateText}>{t('pharmacyAdmin.orders.subscriptionRequired.body')}</Text>
          <View style={{ width: '100%', marginTop: 16 }}>
            <Button title={t('pharmacyAdmin.orders.actions.viewSubscriptionPlans')} onPress={goToSubscription} />
          </View>
        </View>
      ) : (
        <>
          {!isPharmacyUser ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>{t('screens.orders')}</Text>
              <Text style={styles.emptyStateText}>{t('pharmacyAdmin.common.pharmacyAccountsOnly')}</Text>
            </View>
          ) : isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('pharmacyAdmin.orders.loadingOrders')}</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
              <Text style={styles.emptyStateTitle}>{t('pharmacyAdmin.orders.errorLoadingOrdersTitle')}</Text>
              <Text style={styles.emptyStateText}>{(error as any)?.message || t('pharmacyAdmin.orders.pleaseTryAgain')}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('pharmacyAdmin.orders.placeholders.searchOrders')}
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
                      selectedFilter.key === filter.key && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedStatus(filter.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter.key === filter.key && styles.filterChipTextActive,
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
                    <Text style={styles.emptyStateTitle}>{t('pharmacyAdmin.orders.empty.title')}</Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery || selectedStatus !== 'ALL'
                        ? t('pharmacyAdmin.orders.empty.tryAdjustingFilters')
                        : t('pharmacyAdmin.orders.empty.noOrdersYet')}
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

