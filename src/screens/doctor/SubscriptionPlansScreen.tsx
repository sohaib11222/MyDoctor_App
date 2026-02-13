import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import * as subscriptionApi from '../../services/subscription';
import * as paymentApi from '../../services/payment';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export const SubscriptionPlansScreen = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<subscriptionApi.SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('DUMMY'); // DUMMY, CARD, PAYPAL, BANK
  const [refreshing, setRefreshing] = useState(false);

  const formatLimit = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return t('common.unlimited');
    return value.toString();
  };

  // Fetch all subscription plans
  const { data: plansData, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      const response = await subscriptionApi.listSubscriptionPlans({ isActive: true });
      return response.data || response;
    },
  });

  // Fetch current subscription
  const { data: currentSubscriptionData, isLoading: subscriptionLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: async () => {
      const response = await subscriptionApi.getMySubscription();
      return response.data || response;
    },
  });

  // Buy subscription mutation (using payment API)
  const buySubscriptionMutation = useMutation({
    mutationFn: async ({ planId, amount, paymentMethod }: { planId: string; amount: number; paymentMethod: string }) => {
      return paymentApi.processSubscriptionPayment(planId, amount, paymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      queryClient.invalidateQueries({ queryKey: ['doctorTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.subscriptionPlans.toasts.purchasedSuccessfully'),
      });
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setPaymentMethod('DUMMY');
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.subscriptionPlans.errors.failedToPurchase');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Format price for display
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  // Format duration for display
  const formatDuration = (days: number): string => {
    if (days === 30) return t('more.subscriptionPlans.duration.perMonth');
    if (days === 90) return t('more.subscriptionPlans.duration.perThreeMonths');
    if (days === 365) return t('more.subscriptionPlans.duration.perYear');
    return t('more.subscriptionPlans.duration.perDays', { count: days });
  };

  // Format expiration date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t('common.na');
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get current plan ID
  const currentPlanId = useMemo(() => {
    if (!currentSubscriptionData) return null;
    const plan = currentSubscriptionData.subscriptionPlan;
    if (!plan) return null;
    return typeof plan === 'object' && plan !== null ? plan._id : plan;
  }, [currentSubscriptionData]);

  // Check if plan is current
  const isCurrentPlan = (planId: string): boolean => {
    return planId === currentPlanId;
  };

  // Determine if plan is popular (middle plan or based on price)
  const isPopularPlan = (plan: subscriptionApi.SubscriptionPlan, allPlans: subscriptionApi.SubscriptionPlan[]): boolean => {
    if (!allPlans || allPlans.length < 2) return false;
    // Sort plans by price
    const sortedPlans = [...allPlans].sort((a, b) => a.price - b.price);
    // Mark middle plan as popular
    const middleIndex = Math.floor(sortedPlans.length / 2);
    return sortedPlans[middleIndex]?._id === plan._id;
  };

  // Handle plan selection
  const handleUpgrade = (plan: subscriptionApi.SubscriptionPlan) => {
    if (isCurrentPlan(plan._id)) {
      Toast.show({
        type: 'info',
        text1: t('common.info'),
        text2: t('more.subscriptionPlans.toasts.currentPlan'),
      });
      return;
    }
    if (plan.status !== 'ACTIVE') {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('more.subscriptionPlans.errors.planNotAvailable'),
      });
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  // Handle payment
  const handlePayment = () => {
    if (selectedPlan) {
      buySubscriptionMutation.mutate({
        planId: selectedPlan._id,
        amount: selectedPlan.price,
        paymentMethod: paymentMethod,
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPlans(), refetchSubscription()]);
    setRefreshing(false);
  };

  const plans = plansData || [];
  const currentSubscription = currentSubscriptionData || {};

  if (plansLoading || subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.subscriptionPlans.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plansError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('more.subscriptionPlans.error.title')}</Text>
          <Text style={styles.errorText}>
            {(plansError as any)?.response?.data?.message ||
              (plansError as any)?.message ||
              t('more.subscriptionPlans.error.failedToLoad')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Current Plan Info */}
        {currentSubscription?.subscriptionPlan && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanContent}>
              <View>
                <Text style={styles.currentPlanTitle}>
                  {t('more.subscriptionPlans.currentPlan.label')}{' '}
                  {typeof currentSubscription.subscriptionPlan === 'object'
                    ? currentSubscription.subscriptionPlan.name
                    : t('common.na')}
                </Text>
                <Text style={styles.currentPlanSubtitle}>
                  {currentSubscription.hasActiveSubscription ? (
                    <>
                      {t('more.subscriptionPlans.currentPlan.renewsOn', {
                        date: formatDate(currentSubscription.subscriptionExpiresAt),
                      })}
                    </>
                  ) : (
                    <>
                      {t('more.subscriptionPlans.currentPlan.expiredOn', {
                        date: formatDate(currentSubscription.subscriptionExpiresAt),
                      })}
                    </>
                  )}
                </Text>
              </View>
              <View style={[styles.activeBadge, !currentSubscription.hasActiveSubscription && styles.expiredBadge]}>
                <Text style={styles.activeBadgeText}>
                  {currentSubscription.hasActiveSubscription
                    ? t('more.subscriptionPlans.currentPlan.status.active')
                    : t('more.subscriptionPlans.currentPlan.status.expired')}
                </Text>
              </View>
            </View>

            {(currentSubscription as any)?.usage && (currentSubscription as any)?.remaining && (
              <View style={styles.usageCard}>
                <Text style={styles.usageTitle}>{t('more.subscriptionPlans.usage.title')}</Text>
                <View style={styles.usageGrid}>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageLabel}>{t('more.subscriptionPlans.usage.privateConsultations')}</Text>
                    <Text style={styles.usageValue}>
                      {(currentSubscription as any).usage.privateConsultations} / {formatLimit((currentSubscription as any).subscriptionPlan?.limits?.privateConsultations)}
                    </Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageLabel}>{t('more.subscriptionPlans.usage.videoConsultations')}</Text>
                    <Text style={styles.usageValue}>
                      {(currentSubscription as any).usage.videoConsultations} / {formatLimit((currentSubscription as any).subscriptionPlan?.limits?.videoConsultations)}
                    </Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageLabel}>{t('more.subscriptionPlans.usage.chatSessions')}</Text>
                    <Text style={styles.usageValue}>
                      {(currentSubscription as any).usage.chatSessions} / {formatLimit((currentSubscription as any).subscriptionPlan?.limits?.chatSessions)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* No Current Subscription */}
        {!currentSubscription?.subscriptionPlan && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={24} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>{t('more.subscriptionPlans.noActiveSubscription.title')}</Text>
              <Text style={styles.warningText}>{t('more.subscriptionPlans.noActiveSubscription.body')}</Text>
            </View>
          </View>
        )}

        {/* Subscription Plans */}
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>{t('more.subscriptionPlans.empty.title')}</Text>
            <Text style={styles.emptyText}>{t('more.subscriptionPlans.empty.body')}</Text>
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan._id);
              const isPopular = isPopularPlan(plan, plans);

              return (
                <View
                  key={plan._id}
                  style={[
                    styles.planCard,
                    isPopular && styles.popularPlanCard,
                    isCurrent && styles.currentPlanCardStyle,
                  ]}
                >
                  {isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>{t('more.subscriptionPlans.badges.mostPopular')}</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t('more.subscriptionPlans.badges.currentPlan')}</Text>
                    </View>
                  )}
                  <View style={styles.planContent}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.pricing}>
                      <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                      <Text style={styles.planPeriod}>{formatDuration(plan.durationInDays)}</Text>
                    </View>

                    {plan.limits && (
                      <View style={styles.limitsContainer}>
                        <Text style={styles.limitsTitle}>{t('more.subscriptionPlans.limits.title')}</Text>
                        <Text style={styles.limitsText}>
                          {t('more.subscriptionPlans.limits.privateConsultations', {
                            value: formatLimit(plan.limits.privateConsultations),
                          })}
                        </Text>
                        <Text style={styles.limitsText}>
                          {t('more.subscriptionPlans.limits.videoConsultations', {
                            value: formatLimit(plan.limits.videoConsultations),
                          })}
                        </Text>
                        <Text style={styles.limitsText}>
                          {t('more.subscriptionPlans.limits.chatSessions', {
                            value: formatLimit(plan.limits.chatSessions),
                          })}
                        </Text>
                        <Text style={styles.limitsText}>
                          {t('more.subscriptionPlans.limits.crmAccess', {
                            value: plan.crmAccess ? t('common.yes') : t('common.no'),
                          })}
                        </Text>
                      </View>
                    )}

                    <View style={styles.featuresList}>
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, index) => (
                          <View key={index} style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noFeaturesText}>{t('more.subscriptionPlans.features.noneListed')}</Text>
                      )}
                    </View>
                    {isCurrent ? (
                      <TouchableOpacity style={styles.currentPlanButton} disabled>
                        <Text style={styles.currentPlanButtonText}>{t('more.subscriptionPlans.badges.currentPlan')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.upgradeButton, isPopular && styles.popularUpgradeButton]}
                        onPress={() => handleUpgrade(plan)}
                        activeOpacity={0.7}
                        disabled={plan.status !== 'ACTIVE'}
                      >
                        <Text
                          style={[
                            styles.upgradeButtonText,
                            isPopular && styles.popularUpgradeButtonText,
                          ]}
                        >
                          {plan.status === 'ACTIVE'
                            ? t('more.subscriptionPlans.actions.subscribeNow')
                            : t('more.subscriptionPlans.actions.notAvailable')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Info Alert */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('more.subscriptionPlans.info.title')}</Text>
            <Text style={styles.infoText}>{t('more.subscriptionPlans.info.body')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('more.subscriptionPlans.paymentModal.title')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPlan(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                {selectedPlan && (
                  <>
                    <View style={styles.selectedPlanInfo}>
                      <Text style={styles.selectedPlanName}>
                        {t('more.subscriptionPlans.paymentModal.selectedPlan', { name: selectedPlan.name })}
                      </Text>
                      <Text style={styles.selectedPlanPrice}>
                        {t('more.subscriptionPlans.paymentModal.price', {
                          price: formatPrice(selectedPlan.price),
                          duration: formatDuration(selectedPlan.durationInDays),
                        })}
                      </Text>
                    </View>

                    <Text style={styles.paymentMethodTitle}>{t('more.subscriptionPlans.paymentModal.paymentMethod')}</Text>
                    <View style={styles.paymentMethods}>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'DUMMY' && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod('DUMMY')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="card" size={20} color={colors.primary} />
                        <Text style={styles.paymentMethodText}>{t('more.subscriptionPlans.paymentMethods.dummy')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'CARD' && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod('CARD')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="card" size={20} color={colors.primary} />
                        <Text style={styles.paymentMethodText}>{t('more.subscriptionPlans.paymentMethods.card')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'PAYPAL' && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod('PAYPAL')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="logo-paypal" size={20} color={colors.primary} />
                        <Text style={styles.paymentMethodText}>{t('more.subscriptionPlans.paymentMethods.paypal')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'BANK' && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod('BANK')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="business" size={20} color={colors.primary} />
                        <Text style={styles.paymentMethodText}>{t('more.subscriptionPlans.paymentMethods.bank')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPlan(null);
                }}
                activeOpacity={0.7}
                disabled={buySubscriptionMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Button
                title={
                  buySubscriptionMutation.isPending
                    ? t('common.processing')
                    : t('more.subscriptionPlans.actions.payNow')
                }
                onPress={handlePayment}
                style={styles.payButton}
                disabled={buySubscriptionMutation.isPending}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  currentPlanCard: {
    backgroundColor: colors.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  currentPlanContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  currentPlanSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  expiredBadge: {
    backgroundColor: colors.error,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  usageCard: {
    marginTop: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 10,
    padding: 12,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  usageGrid: {
    gap: 10,
  },
  usageItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  usageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '20',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  popularPlanCard: {
    borderColor: colors.primary,
  },
  currentPlanCardStyle: {
    borderColor: colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
  },
  planContent: {
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  pricing: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  limitsContainer: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  limitsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  featuresList: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  noFeaturesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  currentPlanButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  upgradeButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  popularUpgradeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  popularUpgradeButtonText: {
    color: colors.textWhite,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  selectedPlanInfo: {
    marginBottom: 20,
  },
  selectedPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedPlanPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentMethods: {
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  paymentMethodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  payButton: {
    flex: 1,
  },
});
