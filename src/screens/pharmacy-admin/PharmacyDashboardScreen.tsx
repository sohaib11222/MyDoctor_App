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
  Dimensions,
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
import { useTranslation } from 'react-i18next';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

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
  const { t, i18n } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [chartsWidth, setChartsWidth] = useState<number>(Math.min(Dimensions.get('window').width - 64, 420));
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

  const orders = useMemo(() => {
    const r: any = ordersResponse as any;
    const data = r?.data ?? r;
    return (data?.orders || data?.data?.orders || []) as any[];
  }, [ordersResponse]);

  const normalizeEnum = (v: any) => String(v || '').trim().toUpperCase();

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
        return key === todayKey && normalizeEnum(o.paymentStatus) === 'PAID';
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, todayKey]);

  const pendingCount = useMemo(
    () => orders.filter((o) => normalizeEnum(o.status) === 'PENDING').length,
    [orders]
  );
  const totalOrders = useMemo(() => orders.length, [orders]);

  const revenueLast7Days = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const dayBuckets: { key: string; label: string; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = d.toLocaleDateString(i18n.language, { weekday: 'short' });
      dayBuckets.push({ key, label, total: 0 });
    }

    const idxByKey = new Map(dayBuckets.map((b, idx) => [b.key, idx] as const));

    orders.forEach((o: any) => {
      if (normalizeEnum(o?.paymentStatus) !== 'PAID') return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const idx = idxByKey.get(key);
      if (idx === undefined) return;
      dayBuckets[idx].total += Number(o.total) || 0;
    });

    return dayBuckets;
  }, [i18n.language, orders]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o: any) => {
      const s = normalizeEnum(o?.status) || 'UNKNOWN';
      counts.set(s, (counts.get(s) || 0) + 1);
    });

    const statusColorMap: Record<string, string> = {
      PENDING: colors.warning,
      CONFIRMED: colors.primary,
      PROCESSING: colors.primary,
      SHIPPED: colors.info,
      DELIVERED: colors.success,
      CANCELLED: colors.error,
      REFUNDED: colors.error,
    };

    const items = Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        color: statusColorMap[status] || colors.textSecondary,
        label: t(`pharmacy.checkout.orders.status.${status}` as any, { defaultValue: status }),
      }))
      .sort((a, b) => b.count - a.count);

    const total = items.reduce((sum, it) => sum + it.count, 0);
    return { items, total };
  }, [orders, t]);

  const renderRevenueChart = () => {
    const width = Math.max(240, chartsWidth);
    const height = 170;
    const paddingX = 12;
    const paddingTop = 10;
    const paddingBottom = 28;
    const chartHeight = height - paddingTop - paddingBottom;
    const values = revenueLast7Days.map((d) => d.total);
    const maxValue = Math.max(...values, 1);
    const barCount = revenueLast7Days.length;
    const barSpace = (width - paddingX * 2) / barCount;
    const barWidth = Math.max(10, Math.min(26, barSpace * 0.55));

    return (
      <Svg width={width} height={height}>
        {revenueLast7Days.map((d, idx) => {
          const barH = (d.total / maxValue) * chartHeight;
          const x = paddingX + idx * barSpace + (barSpace - barWidth) / 2;
          const y = paddingTop + (chartHeight - barH);
          return (
            <G key={d.key}>
              <Rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={colors.primary} opacity={0.9} />
              <SvgText
                x={paddingX + idx * barSpace + barSpace / 2}
                y={height - 10}
                fontSize={11}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    };
  };

  const describeArc = (cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const startInner = polarToCartesian(cx, cy, rInner, startAngle);
    const endInner = polarToCartesian(cx, cy, rInner, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  };

  const renderStatusChart = () => {
    const size = 170;
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = 72;
    const rInner = 46;
    const total = Math.max(statusBreakdown.total, 1);

    let startAngle = 0;

    return (
      <Svg width={size} height={size}>
        {statusBreakdown.items.map((it) => {
          const sweep = (it.count / total) * 360;
          const endAngle = startAngle + sweep;
          const path = describeArc(cx, cy, rOuter, rInner, startAngle, endAngle);
          const el = <Path key={it.status} d={path} fill={it.color} opacity={0.9} />;
          startAngle = endAngle;
          return el;
        })}
        <SvgText x={cx} y={cy - 2} fontSize={18} fill={colors.text} fontWeight="700" textAnchor="middle">
          {statusBreakdown.total}
        </SvgText>
        <SvgText x={cx} y={cy + 18} fontSize={11} fill={colors.textSecondary} textAnchor="middle">
          {t('pharmacyAdmin.dashboard.charts.status.total')}
        </SvgText>
      </Svg>
    );
  };

  const stats = useMemo<StatCard[]>(() => {
    return [
      {
        id: '1',
        title: t('pharmacyAdmin.dashboard.stats.revenueToday'),
        value: new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(revenueToday || 0),
        icon: 'cash',
        iconColor: colors.primary,
        progress: Math.min(100, Math.round((revenueToday / 500) * 100) || 0),
      },
      {
        id: '2',
        title: t('pharmacyAdmin.dashboard.stats.totalOrders'),
        value: String(totalOrders),
        icon: 'file-text',
        iconColor: colors.success,
        progress: Math.min(100, totalOrders > 0 ? 100 : 0),
      },
      {
        id: '3',
        title: t('pharmacyAdmin.dashboard.stats.pendingOrders'),
        value: String(pendingCount),
        icon: 'time',
        iconColor: colors.warning,
        progress: Math.min(100, totalOrders ? Math.round((pendingCount / totalOrders) * 100) : 0),
      },
      {
        id: '4',
        title: t('pharmacyAdmin.dashboard.stats.totalProducts'),
        value: String(totalProducts),
        icon: 'medical',
        iconColor: colors.error,
        progress: Math.min(100, totalProducts > 0 ? 100 : 0),
      },
    ];
  }, [i18n.language, pendingCount, revenueToday, t, totalOrders, totalProducts]);

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
          : t('common.na');

        const dateAdded = new Date(order.createdAt).toLocaleDateString(i18n.language, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        map.set(patientId, {
          id: patientId,
          name: patient?.fullName || t('pharmacyAdmin.common.customer'),
          address: addr,
          telephone: patient?.phone || t('common.na'),
          email: patient?.email || t('common.na'),
          dateAdded,
        });
      });
    return Array.from(map.values()).slice(0, 5);
  }, [i18n.language, orders, t]);

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
            {t('pharmacyAdmin.dashboard.welcome', {
              name:
                pharmacy?.name ||
                (user as any)?.name ||
                (isParapharmacy ? t('pharmacyAdmin.common.parapharmacy') : t('pharmacyAdmin.common.pharmacy')),
            })}
          </Text>
          <Text style={styles.breadcrumb}>{t('screens.pharmacyDashboard')}</Text>
        </View>

        {isPharmacyOrParaUser && showProfileBanner && (
          <TouchableOpacity style={styles.profileBanner} activeOpacity={0.8} onPress={goToPharmacyProfile}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.profileBannerText}>{t('pharmacyAdmin.dashboard.profileBanner.completeProfile')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}

        {requiresSubscription && subscriptionLoading && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pendingBannerText}>{t('pharmacyAdmin.dashboard.banners.loadingSubscription')}</Text>
          </View>
        )}

        {requiresSubscription && !subscriptionLoading && !hasActiveSubscription && (
          <View style={styles.subscriptionBanner}>
            <View style={styles.subscriptionBannerRow}>
              <Ionicons name="card-outline" size={18} color={colors.warning} />
              <Text style={styles.subscriptionBannerText}>{t('pharmacyAdmin.dashboard.banners.subscriptionRequired')}</Text>
            </View>
            <Button title={t('pharmacyAdmin.dashboard.actions.viewPlans')} onPress={goToSubscription} />
          </View>
        )}

        {isPharmacyOrParaUser && !isApproved && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <Text style={styles.pendingBannerText}>{t('pharmacyAdmin.dashboard.banners.pendingApproval')}</Text>
          </View>
        )}

        {!isPharmacyOrParaUser ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.loadingText}>{t('pharmacyAdmin.common.pharmacyAccountsOnly')}</Text>
          </View>
        ) : isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('pharmacyAdmin.dashboard.loadingDashboard')}</Text>
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
            <View
              style={styles.chartsSection}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w && Number.isFinite(w)) {
                  setChartsWidth(Math.min(w - 32, 520));
                }
              }}
            >
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>{t('pharmacyAdmin.dashboard.charts.revenue.title')}</Text>
                </View>
                {orders.length > 0 ? (
                  <View style={styles.chartBody}>
                    {renderRevenueChart()}
                    <Text style={styles.chartHintText}>{t('pharmacyAdmin.dashboard.charts.revenue.last7Days')}</Text>
                  </View>
                ) : (
                  <View style={styles.chartPlaceholder}>
                    <Ionicons name="bar-chart" size={48} color={colors.textLight} />
                    <Text style={styles.chartPlaceholderText}>{t('pharmacyAdmin.dashboard.charts.revenue.placeholder')}</Text>
                  </View>
                )}
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>{t('pharmacyAdmin.dashboard.charts.status.title')}</Text>
                </View>
                {statusBreakdown.total > 0 ? (
                  <View style={styles.statusChartBody}>
                    {renderStatusChart()}
                    <View style={styles.statusLegend}>
                      {statusBreakdown.items.slice(0, 6).map((it) => (
                        <View key={it.status} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: it.color }]} />
                          <Text style={styles.legendLabel} numberOfLines={1}>
                            {it.label}
                          </Text>
                          <Text style={styles.legendValue}>{it.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.chartPlaceholder}>
                    <Ionicons name="trending-up" size={48} color={colors.textLight} />
                    <Text style={styles.chartPlaceholderText}>{t('pharmacyAdmin.dashboard.charts.status.placeholder')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Latest Customers */}
            <View style={styles.customersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('pharmacyAdmin.dashboard.customers.latestCustomers')}</Text>
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
                  <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customersCard}>
                <View style={styles.customersHeader}>
                  <Text style={styles.tableHeader}>{t('pharmacyAdmin.dashboard.customers.table.name')}</Text>
                  <Text style={styles.tableHeader}>{t('pharmacyAdmin.dashboard.customers.table.address')}</Text>
                  <Text style={styles.tableHeader}>{t('pharmacyAdmin.dashboard.customers.table.telephone')}</Text>
                  <Text style={styles.tableHeader}>{t('pharmacyAdmin.dashboard.customers.table.email')}</Text>
                  <Text style={styles.tableHeader}>{t('pharmacyAdmin.dashboard.customers.table.dateAdded')}</Text>
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
  chartBody: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartHintText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
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
  statusChartBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 10,
  },
  statusLegend: {
    flex: 1,
    paddingLeft: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginRight: 8,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
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

