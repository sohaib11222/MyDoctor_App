import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';
import { useTranslation } from 'react-i18next';

export const PharmacySubscriptionPlansScreen = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<pharmacySubscriptionApi.PharmacySubscriptionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: plansResponse,
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['pharmacy-subscription-plans'],
    queryFn: () => pharmacySubscriptionApi.getPharmacyActivePlans(),
    retry: 1,
  });

  const {
    data: subscriptionResponse,
    isLoading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: ['my-pharmacy-subscription'],
    queryFn: () => pharmacySubscriptionApi.getMyPharmacySubscription(),
    retry: 1,
  });

  const plans = useMemo(() => {
    const r: any = plansResponse as any;
    const data = r?.data ?? r;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.plans)) return data.plans;
    if (Array.isArray(data?.data?.plans)) return data.data.plans;
    return [];
  }, [plansResponse]);

  const mySubscription = useMemo(() => {
    const r: any = subscriptionResponse as any;
    const data = r?.data ?? r;
    return data?.data ?? data ?? {};
  }, [subscriptionResponse]);

  const currentPlanId = useMemo(() => {
    const plan = mySubscription?.subscriptionPlan;
    if (!plan) return null;
    return typeof plan === 'object' && plan !== null ? plan._id : plan;
  }, [mySubscription]);

  const buyMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) => pharmacySubscriptionApi.buyPharmacySubscriptionPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('pharmacyAdmin.subscriptionPlans.toasts.purchasedSuccessfully'),
      });
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        t('pharmacyAdmin.subscriptionPlans.errors.failedToPurchase');
      Toast.show({ type: 'error', text1: t('common.error'), text2: msg });
    },
  });

  const formatPrice = (price: number | undefined | null) => {
    const n = price === undefined || price === null ? 0 : Number(price);
    return new Intl.NumberFormat(i18n.language || 'en', {
      style: 'currency',
      currency: 'EUR',
    }).format(n);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('common.na');
    const d = new Date(dateString);
    return d.toLocaleDateString(i18n.language || 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPlans(), refetchSubscription()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.subscriptionPlans.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plansError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('pharmacyAdmin.subscriptionPlans.error.title')}</Text>
          <Text style={styles.errorText}>
            {(plansError as any)?.response?.data?.message ||
              (plansError as any)?.message ||
              t('pharmacyAdmin.subscriptionPlans.error.failedToLoad')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentPlan = (planId: string) => planId === currentPlanId;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('pharmacyAdmin.subscriptionPlans.title')}</Text>
          <Text style={styles.subtitle}>{t('pharmacyAdmin.subscriptionPlans.subtitle')}</Text>
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentTitle}>{t('pharmacyAdmin.subscriptionPlans.currentSubscriptionTitle')}</Text>
              {mySubscription?.subscriptionPlan ? (
                <>
                  <Text style={styles.currentText}>
                    {t('pharmacyAdmin.subscriptionPlans.labels.plan')}{' '}
                    <Text style={{ fontWeight: '700', color: colors.text }}>
                      {typeof mySubscription.subscriptionPlan === 'object'
                        ? mySubscription.subscriptionPlan.name
                        : '—'}
                    </Text>
                  </Text>
                  <Text style={styles.currentText}>
                    {mySubscription?.hasActiveSubscription
                      ? t('pharmacyAdmin.subscriptionPlans.labels.expiresOn')
                      : t('pharmacyAdmin.subscriptionPlans.labels.expiredOn')}{' '}
                    {formatDate(mySubscription.subscriptionExpiresAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.currentText}>{t('pharmacyAdmin.subscriptionPlans.noActiveSubscription')}</Text>
              )}
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: mySubscription?.hasActiveSubscription ? colors.success : colors.error },
              ]}
            >
              <Text style={styles.badgeText}>
                {mySubscription?.hasActiveSubscription
                  ? t('pharmacyAdmin.subscriptionPlans.status.active')
                  : t('pharmacyAdmin.subscriptionPlans.status.inactive')}
              </Text>
            </View>
          </View>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={56} color={colors.textLight} />
            <Text style={styles.emptyTitle}>{t('pharmacyAdmin.subscriptionPlans.empty.title')}</Text>
            <Text style={styles.emptyText}>{t('pharmacyAdmin.subscriptionPlans.empty.body')}</Text>
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan: any) => {
              const current = isCurrentPlan(plan._id);
              return (
                <View key={plan._id} style={[styles.planCard, current && styles.planCardCurrent]}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {current && (
                      <View style={styles.currentPill}>
                        <Text style={styles.currentPillText}>{t('pharmacyAdmin.subscriptionPlans.badges.current')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                    <Text style={styles.planDuration}>
                      {t('pharmacyAdmin.subscriptionPlans.labels.duration', { days: plan.durationInDays })}
                    </Text>
                  </View>

                  <View style={styles.featuresList}>
                    {(Array.isArray(plan.features) && plan.features.length > 0
                      ? plan.features
                      : [t('pharmacyAdmin.subscriptionPlans.features.default')]).map(
                      (feature: string, idx: number) => (
                        <View key={`${plan._id}-f-${idx}`} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      )
                    )}
                  </View>

                  {current ? (
                    <TouchableOpacity style={styles.currentButton} disabled>
                      <Text style={styles.currentButtonText}>{t('pharmacyAdmin.subscriptionPlans.actions.currentPlan')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.buyButton}
                      onPress={() => setSelectedPlan(plan)}
                      activeOpacity={0.7}
                      disabled={buyMutation.isPending || plan.status !== 'ACTIVE'}
                    >
                      <Text style={styles.buyButtonText}>
                        {plan.status === 'ACTIVE'
                          ? t('pharmacyAdmin.subscriptionPlans.actions.buyPlan')
                          : t('pharmacyAdmin.subscriptionPlans.actions.notAvailable')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedPlan} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pharmacyAdmin.subscriptionPlans.modal.title')}</Text>
              <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLine}>
                  {t('pharmacyAdmin.subscriptionPlans.modal.plan')}{' '}
                  <Text style={{ fontWeight: '700' }}>{selectedPlan.name}</Text>
                </Text>
                <Text style={styles.modalLine}>
                  {t('pharmacyAdmin.subscriptionPlans.modal.price')}{' '}
                  <Text style={{ fontWeight: '700' }}>{formatPrice(selectedPlan.price)}</Text>
                </Text>
                <Text style={styles.modalHint}>{t('pharmacyAdmin.subscriptionPlans.modal.hint')}</Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedPlan(null)}
                disabled={buyMutation.isPending}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Button
                title={
                  buyMutation.isPending
                    ? t('common.processing')
                    : t('pharmacyAdmin.subscriptionPlans.actions.confirm')
                }
                onPress={() => {
                  if (!selectedPlan) return;
                  buyMutation.mutate({ planId: selectedPlan._id });
                }}
                disabled={buyMutation.isPending}
                style={{ flex: 1 }}
                icon="lock-closed"
              />
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  currentCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  currentText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  plansContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  planCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planCardCurrent: {
    borderColor: colors.success,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  currentPill: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  planPricing: {
    marginTop: 10,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  planDuration: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  featuresList: {
    marginTop: 12,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  buyButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: colors.textWhite,
    fontWeight: '800',
    fontSize: 14,
  },
  currentButton: {
    marginTop: 14,
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentButtonText: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalBody: {
    marginTop: 14,
  },
  modalLine: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  modalHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '700',
  },
});
