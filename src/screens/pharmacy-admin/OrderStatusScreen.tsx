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
import { useTranslation } from 'react-i18next';

type OrderStatusScreenNavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderStatus'>;
type OrderStatusRouteProp = RouteProp<OrdersStackParamList, 'OrderStatus'>;

export const OrderStatusScreen = () => {
  const navigation = useNavigation<OrderStatusScreenNavigationProp>();
  const route = useRoute<OrderStatusRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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

  const order = React.useMemo<orderApi.Order | null>(() => {
    const r: any = orderResponse as any;
    const data = r?.data ?? r;
    if (!data) return null;
    const maybeOrder = data?.data ?? data;
    if (!maybeOrder) return null;
    if (maybeOrder?.orders && Array.isArray(maybeOrder.orders)) return maybeOrder.orders[0] ?? null;
    return maybeOrder as orderApi.Order;
  }, [orderResponse]);
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
      Toast.show({ type: 'success', text1: t('pharmacyAdmin.orders.details.toasts.orderStatusUpdated') });
      navigation.goBack();
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: t('pharmacyAdmin.orders.details.toasts.failedToUpdateOrderStatusTitle'),
        text2: err?.response?.data?.message || err?.message || t('pharmacyAdmin.orders.pleaseTryAgain'),
      });
    },
  });

  const handleUpdateStatus = () => {
    if (!order) return;
    if (selectedStatus === order.status) {
      Alert.alert(
        t('pharmacyAdmin.orders.statusScreen.alerts.noChangeTitle'),
        t('pharmacyAdmin.orders.statusScreen.alerts.noChangeBody')
      );
      return;
    }

    updateStatusMutation.mutate(selectedStatus);
  };

  const getStatusDescription = (status: orderApi.Order['status']) => {
    return t(`pharmacyAdmin.orders.statusDescriptions.${status}` as any, { defaultValue: '' });
  };

  const statusOptions = React.useMemo(
    () => [
      { value: 'PENDING' as const, label: t('pharmacyAdmin.orders.status.PENDING'), icon: 'time-outline', color: colors.warning },
      { value: 'CONFIRMED' as const, label: t('pharmacyAdmin.orders.status.CONFIRMED'), icon: 'checkmark-outline', color: colors.primary },
      { value: 'PROCESSING' as const, label: t('pharmacyAdmin.orders.status.PROCESSING'), icon: 'sync-outline', color: colors.primary },
      { value: 'SHIPPED' as const, label: t('pharmacyAdmin.orders.status.SHIPPED'), icon: 'car-outline', color: colors.info },
      { value: 'DELIVERED' as const, label: t('pharmacyAdmin.orders.status.DELIVERED'), icon: 'checkmark-circle-outline', color: colors.success },
      { value: 'CANCELLED' as const, label: t('pharmacyAdmin.orders.status.CANCELLED'), icon: 'close-circle-outline', color: colors.error },
      { value: 'REFUNDED' as const, label: t('pharmacyAdmin.orders.status.REFUNDED'), icon: 'cash-outline', color: colors.error },
    ],
    [t]
  );

  if (!isPharmacyUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.common.pharmacyAccountsOnly')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.dashboard.banners.loadingSubscription')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="card-outline" size={48} color={colors.warning} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.orders.statusScreen.gates.subscriptionRequiredBody')}</Text>
          <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 16 }}>
            <Button title={t('pharmacyAdmin.orders.actions.viewSubscriptionPlans')} onPress={goToSubscription} />
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
          <Text style={styles.loadingText}>{t('pharmacyAdmin.orders.statusScreen.loadingOrder')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>{(error as any)?.message || t('pharmacyAdmin.orders.statusScreen.failedToLoadOrder')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const localizedCurrentStatus = t(`pharmacyAdmin.orders.status.${order.status}` as any, { defaultValue: order.status });
  const currentStatusColor = statusOptions.find((s) => s.value === order.status)?.color || colors.textSecondary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={styles.currentStatusContainer}>
            <Text style={styles.currentStatusLabel}>{t('pharmacyAdmin.orders.statusScreen.currentStatusLabel')}</Text>
            <View
              style={[
                styles.currentStatusBadge,
                {
                  backgroundColor: `${currentStatusColor}20`,
                },
              ]}
            >
              <Text
                style={[
                  styles.currentStatusText,
                  { color: currentStatusColor },
                ]}
              >
                {localizedCurrentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pharmacyAdmin.orders.statusScreen.selectNewStatusTitle')}</Text>
          <Text style={styles.sectionDescription}>
            {t('pharmacyAdmin.orders.statusScreen.selectNewStatusBody')}
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
              {t('pharmacyAdmin.orders.statusScreen.cancelledWarning')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        <Button
          title={t('pharmacyAdmin.orders.details.actions.updateStatus')}
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

