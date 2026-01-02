import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList, MoreStackParamList } from '../../navigation/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as orderApi from '../../services/order';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';

type OrderHistoryScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<PharmacyStackParamList | MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

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

export const OrderHistoryScreen = () => {
  const navigation = useNavigation<OrderHistoryScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const limit = 10;

  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patientOrders', statusFilter, page],
    queryFn: () =>
      orderApi.getPatientOrders({
        status: statusFilter || undefined,
        page,
        limit,
      }),
    enabled: !!user,
    placeholderData: (previousData) => previousData,
  });

  const orders = useMemo(() => {
    return ordersResponse?.data?.orders || [];
  }, [ordersResponse]);

  // Fetch all orders (without status filter) to get counts for each status
  const { data: allOrdersResponse } = useQuery({
    queryKey: ['patientOrders', 'all', user?._id || user?.id],
    queryFn: () =>
      orderApi.getPatientOrders({
        page: 1,
        limit: 1000, // Get all orders for counting
      }),
    enabled: !!user,
  });

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    const allOrders = allOrdersResponse?.data?.orders || [];
    const counts: Record<string, number> = {
      'ALL': allOrders.length,
      'PENDING': 0,
      'CONFIRMED': 0,
      'PROCESSING': 0,
      'SHIPPED': 0,
      'DELIVERED': 0,
      'CANCELLED': 0,
    };
    
    allOrders.forEach((order: orderApi.Order) => {
      const status = order.status;
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [allOrdersResponse]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderOrderCard = ({ item: order }: { item: orderApi.Order }) => {
    const pharmacy = typeof order.pharmacyId === 'object' ? order.pharmacyId : null;
    const pharmacyName = pharmacy?.name || 'Pharmacy';
    const firstItem = order.items[0];
    const product = typeof firstItem?.productId === 'object' ? firstItem.productId : null;
    const productImage = product?.images?.[0];
    const normalizedImageUrl = normalizeImageUrl(productImage);
    const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          navigation.navigate('OrderDetails', { orderId: order._id });
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <Text style={styles.pharmacyName}>{pharmacyName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusBadgeColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </View>
        <View style={styles.orderBody}>
          <Image source={imageSource} style={styles.productImage} defaultSource={defaultAvatar} />
          <View style={styles.orderDetails}>
            <Text style={styles.itemsCount}>
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.orderDate}>Ordered on {formatDate(order.createdAt)}</Text>
            {order.deliveredAt && (
              <Text style={styles.deliveredDate}>Delivered on {formatDate(order.deliveredAt)}</Text>
            )}
          </View>
          <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
        </View>
        <View style={styles.orderFooter}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              navigation.navigate('OrderDetails', { orderId: order._id });
            }}
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          {/* Only allow cancellation if order is not paid yet */}
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && 
           order.paymentStatus === 'PENDING' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                Alert.alert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order?',
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await orderApi.cancelOrder(order._id);
                          queryClient.invalidateQueries({ queryKey: ['patientOrders'] });
                          Toast.show({
                            type: 'success',
                            text1: 'Order Cancelled',
                            text2: 'Your order has been cancelled successfully',
                          });
                        } catch (error: any) {
                          Toast.show({
                            type: 'error',
                            text1: 'Failed to Cancel',
                            text2: error.response?.data?.message || error.message || 'Please try again',
                          });
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {/* Show Processing if shipping fee not set yet, Pay Now if shipping fee is set and payment pending */}
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && 
           (order.finalShipping === null || order.finalShipping === undefined) && 
           order.paymentStatus === 'PENDING' && (
            <View style={[styles.actionButton, styles.processingButton]}>
              <Text style={[styles.actionButtonText, styles.processingButtonText]}>Processing...</Text>
            </View>
          )}
          {(order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL' || order.requiresPaymentUpdate) && 
           order.finalShipping !== null && order.finalShipping !== undefined && (
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={() => {
                // Navigate to OrderDetails - works from both PharmacyStack and MoreStack
                navigation.navigate('OrderDetails' as never, { orderId: order._id } as never);
              }}
            >
              <Text style={[styles.actionButtonText, styles.payButtonText]}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && page === 1) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Error Loading Orders</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load orders'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterOption, statusFilter === '' && styles.filterOptionActive]}
            onPress={() => {
              setStatusFilter('');
              setPage(1);
            }}
          >
            <Text style={[styles.filterOptionText, statusFilter === '' && styles.filterOptionTextActive]}>
              All
            </Text>
            {statusCounts['ALL'] > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{statusCounts['ALL']}</Text>
              </View>
            )}
          </TouchableOpacity>
          {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterOption, statusFilter === status && styles.filterOptionActive]}
              onPress={() => {
                setStatusFilter(status);
                setPage(1);
              }}
            >
              <Text
                style={[styles.filterOptionText, statusFilter === status && styles.filterOptionTextActive]}
              >
                {status}
              </Text>
              {statusCounts[status] > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{statusCounts[status]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          const totalPages = ordersResponse?.data?.pagination?.pages || 0;
          if (page < totalPages) {
            setPage((prev) => prev + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No orders found</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('PharmacyHome')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      />
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  countBadgeText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
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
    alignItems: 'center',
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
  pharmacyName: {
    fontSize: 14,
    color: colors.textSecondary,
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
  orderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  deliveredDate: {
    fontSize: 12,
    color: colors.success,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.errorLight || colors.backgroundLight,
  },
  cancelButtonText: {
    color: colors.error,
  },
  payButton: {
    backgroundColor: colors.successLight || colors.primaryLight,
  },
  payButtonText: {
    color: colors.success || colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  shopButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingMore: {
    marginVertical: 20,
  },
});
