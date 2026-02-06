import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyDashboardStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacyApi from '../../services/pharmacy';
import * as orderApi from '../../services/order';
import * as productApi from '../../services/product';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';
import { Button } from '../../components/common/Button';

type PharmacyDashboardScreenNavigationProp = NativeStackNavigationProp<PharmacyDashboardStackParamList>;

interface StatCard {
  id: string;
  title: string;
  value: string;
  icon: string;
  iconColor: string;
  progress: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  telephone: string;
  email: string;
  dateAdded: string;
}

export const PharmacyDashboardScreen = () => {
  const navigation = useNavigation<PharmacyDashboardScreenNavigationProp>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const userId = user?._id || user?.id;
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyOrParaUser = isPharmacy || isParapharmacy;
  const requiresSubscription = isPharmacy;
  const sellerType = isParapharmacy ? 'PARAPHARMACY' : 'PHARMACY';
  const isApproved = String((user as any)?.status || user?.status || '').toUpperCase() === 'APPROVED';

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

  const { data: myPharmacyResponse } = useQuery({
    queryKey: ['my-pharmacy', userId],
    queryFn: () => pharmacyApi.getMyPharmacy(),
    enabled: !!userId && isPharmacyOrParaUser,
    retry: 1,
  });

  const pharmacy = myPharmacyResponse?.data;

  const isProfileComplete = useMemo(() => {
    if (!pharmacy) return false;
    return !!(
      pharmacy.name &&
      pharmacy.phone &&
      pharmacy.address &&
      pharmacy.address.line1 &&
      pharmacy.address.city
    );
  }, [pharmacy]);

  const showProfileBanner = !!pharmacy && !isProfileComplete;

  const goToPharmacyProfile = () => {
    const parent = (navigation as any).getParent?.();
    if (parent) {
      parent.navigate('More', { screen: 'PharmacyProfile' });
    } else {
      (navigation as any).navigate('More', { screen: 'PharmacyProfile' });
    }
  };

  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['pharmacyOrders', 'dashboard', userId],
    queryFn: () => orderApi.getPharmacyOrders({ page: 1, limit: 200 }),
    enabled: !!userId && isPharmacyOrParaUser && hasActiveSubscription,
    retry: 1,
  });

  const {
    data: productsResponse,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['pharmacy-products', 'count', userId, sellerType],
    queryFn: () => productApi.listProducts({ sellerType: sellerType as any, sellerId: userId, limit: 1 }),
    enabled: !!userId && isPharmacyOrParaUser && hasActiveSubscription,
    retry: 1,
  });

  const orders = useMemo(() => ordersResponse?.data?.orders || [], [ordersResponse]);

  const totalProducts = useMemo(() => {
    return productsResponse?.data?.pagination?.total || 0;
  }, [productsResponse]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, []);

  const revenueToday = useMemo(() => {
    return orders
      .filter((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return key === todayKey && o.paymentStatus === 'PAID';
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, todayKey]);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'PENDING').length, [orders]);
  const totalOrders = useMemo(() => orders.length, [orders]);

  const stats = useMemo<StatCard[]>(() => {
    return [
      {
        id: '1',
        title: 'Revenue Today',
        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(revenueToday || 0),
        icon: 'cash',
        iconColor: colors.primary,
        progress: Math.min(100, Math.round((revenueToday / 500) * 100) || 0),
      },
      {
        id: '2',
        title: 'Total Orders',
        value: String(totalOrders),
        icon: 'file-text',
        iconColor: colors.success,
        progress: Math.min(100, totalOrders > 0 ? 100 : 0),
      },
      {
        id: '3',
        title: 'Pending Orders',
        value: String(pendingCount),
        icon: 'time',
        iconColor: colors.warning,
        progress: Math.min(100, totalOrders ? Math.round((pendingCount / totalOrders) * 100) : 0),
      },
      {
        id: '4',
        title: 'Total Products',
        value: String(totalProducts),
        icon: 'medical',
        iconColor: colors.error,
        progress: Math.min(100, totalProducts > 0 ? 100 : 0),
      },
    ];
  }, [revenueToday, totalOrders, pendingCount, totalProducts]);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    orders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((order) => {
        const patient = typeof order.patientId === 'object' ? order.patientId : null;
        const patientId = patient?._id;
        if (!patientId || map.has(patientId)) return;

        const addr = order.shippingAddress
          ? [
              order.shippingAddress.line1,
              order.shippingAddress.line2,
              order.shippingAddress.city,
              order.shippingAddress.state,
              order.shippingAddress.country,
              order.shippingAddress.zip,
            ]
              .filter(Boolean)
              .join(', ')
          : 'N/A';

        const dateAdded = new Date(order.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        map.set(patientId, {
          id: patientId,
          name: patient?.fullName || 'Customer',
          address: addr,
          telephone: patient?.phone || 'N/A',
          email: patient?.email || 'N/A',
          dateAdded,
        });
      });
    return Array.from(map.values()).slice(0, 5);
  }, [orders]);

  const isLoading = ordersLoading || productsLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOrders(), refetchProducts()]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${item.iconColor}20` }]}>
          <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        </View>
        <Text style={styles.statValue}>{item.value}</Text>
      </View>
      <View style={styles.statFooter}>
        <Text style={styles.statTitle}>{item.title}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: item.iconColor }]} />
        </View>
      </View>
    </View>
  );

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={styles.customerRow} activeOpacity={0.7}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerDetail}>{item.address}</Text>
        <Text style={styles.customerDetail}>{item.telephone}</Text>
        <Text style={styles.customerDetail}>{item.email}</Text>
      </View>
      <Text style={styles.customerDate}>{item.dateAdded}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>
            Welcome, {pharmacy?.name || user?.name || (isParapharmacy ? 'Parapharmacy' : 'Pharmacy')}
          </Text>
          <Text style={styles.breadcrumb}>Dashboard</Text>
        </View>

        {isPharmacyOrParaUser && showProfileBanner && (
          <TouchableOpacity style={styles.profileBanner} activeOpacity={0.8} onPress={goToPharmacyProfile}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.profileBannerText}>Complete your pharmacy profile to add products</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}

        {requiresSubscription && subscriptionLoading && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pendingBannerText}>Loading subscription...</Text>
          </View>
        )}

        {requiresSubscription && !subscriptionLoading && !hasActiveSubscription && (
          <View style={styles.subscriptionBanner}>
            <View style={styles.subscriptionBannerRow}>
              <Ionicons name="card-outline" size={18} color={colors.warning} />
              <Text style={styles.subscriptionBannerText}>Subscription required to manage products and orders</Text>
            </View>
            <Button title="View Plans" onPress={goToSubscription} />
          </View>
        )}

        {isPharmacyOrParaUser && !isApproved && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <Text style={styles.pendingBannerText}>Your account is pending admin approval</Text>
          </View>
        )}

        {!isPharmacyOrParaUser ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.loadingText}>This section is available for pharmacy accounts only.</Text>
          </View>
        ) : isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (

          <View style={{ flex: 1 }}>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <FlatList
                data={stats}
                renderItem={renderStatCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.statsList}
              />
            </View>

            {/* Charts Section */}
            <View style={styles.chartsSection}>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Revenue</Text>
                </View>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="bar-chart" size={48} color={colors.textLight} />
                  <Text style={styles.chartPlaceholderText}>Revenue Chart</Text>
                </View>
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Status</Text>
                </View>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="trending-up" size={48} color={colors.textLight} />
                  <Text style={styles.chartPlaceholderText}>Status Chart</Text>
                </View>
              </View>
            </View>

            {/* Latest Customers */}
            <View style={styles.customersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Customers</Text>
                <TouchableOpacity
                  onPress={() => {
                    const tabNav = (navigation as any).getParent?.();
                    if (tabNav) {
                      (tabNav as any).navigate('Orders', { screen: 'OrdersList' });
                    } else {
                      (navigation as any).navigate('Orders' as any, { screen: 'OrdersList' } as any);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customersCard}>
                <View style={styles.customersHeader}>
                  <Text style={styles.tableHeader}>Name</Text>
                  <Text style={styles.tableHeader}>Address</Text>
                  <Text style={styles.tableHeader}>Telephone</Text>
                  <Text style={styles.tableHeader}>Email</Text>
                  <Text style={styles.tableHeader}>Date added</Text>
                </View>
                <FlatList
                  data={customers}
                  renderItem={renderCustomer}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            </View>
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
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  profileBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  subscriptionBanner: {
    backgroundColor: colors.warningLight,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 10,
  },
  subscriptionBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
    padding: 16,
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  breadcrumb: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    padding: 16,
  },
  statsList: {
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statFooter: {
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartsSection: {
    padding: 16,
    gap: 16,
  },
  chartCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  customersSection: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  customersCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customersHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  tableHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  customerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  customerDate: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});

