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

export const SubscriptionPlansScreen = () => {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<subscriptionApi.SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('DUMMY'); // DUMMY, CARD, PAYPAL, BANK
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all subscription plans
  const { data: plansData, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => {
      const response = await subscriptionApi.listSubscriptionPlans();
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
        text1: 'Success',
        text2: 'Subscription plan purchased successfully!',
      });
      setShowPaymentModal(false);
      setSelectedPlan(null);
      setPaymentMethod('DUMMY');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to purchase subscription';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Format price for display
  const formatPrice = (price: number): string => {
    return `$${price}`;
  };

  // Format duration for display
  const formatDuration = (days: number): string => {
    if (days === 30) return 'per month';
    if (days === 90) return 'per 3 months';
    if (days === 365) return 'per year';
    return `per ${days} days`;
  };

  // Format expiration date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get current plan ID
  const currentPlanId = useMemo(() => {
    if (!currentSubscriptionData) return null;
    const plan = currentSubscriptionData.subscriptionPlan;
    return typeof plan === 'object' ? plan._id : plan;
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
        text1: 'Info',
        text2: 'This is your current plan',
      });
      return;
    }
    if (plan.status !== 'ACTIVE') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'This plan is not available for purchase',
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
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plansError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Plans</Text>
          <Text style={styles.errorText}>
            {(plansError as any)?.response?.data?.message || (plansError as any)?.message || 'Failed to load subscription plans'}
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
                  Current Plan: {typeof currentSubscription.subscriptionPlan === 'object' 
                    ? currentSubscription.subscriptionPlan.name 
                    : 'N/A'}
                </Text>
                <Text style={styles.currentPlanSubtitle}>
                  {currentSubscription.hasActiveSubscription ? (
                    <>Renews on: {formatDate(currentSubscription.subscriptionExpiresAt)}</>
                  ) : (
                    <>Expired on: {formatDate(currentSubscription.subscriptionExpiresAt)}</>
                  )}
                </Text>
              </View>
              <View style={[styles.activeBadge, !currentSubscription.hasActiveSubscription && styles.expiredBadge]}>
                <Text style={styles.activeBadgeText}>
                  {currentSubscription.hasActiveSubscription ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* No Current Subscription */}
        {!currentSubscription?.subscriptionPlan && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={24} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>No Active Subscription</Text>
              <Text style={styles.warningText}>You don't have an active subscription. Please select a plan below.</Text>
            </View>
          </View>
        )}

        {/* Subscription Plans */}
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No subscription plans available</Text>
            <Text style={styles.emptyText}>Please check back later for available plans.</Text>
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
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current Plan</Text>
                    </View>
                  )}
                  <View style={styles.planContent}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description && <Text style={styles.planDescription}>{plan.description}</Text>}
                    <View style={styles.pricing}>
                      <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                      <Text style={styles.planPeriod}>{formatDuration(plan.duration)}</Text>
                    </View>
                    <View style={styles.featuresList}>
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, index) => (
                          <View key={index} style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noFeaturesText}>No features listed</Text>
                      )}
                    </View>
                    {isCurrent ? (
                      <TouchableOpacity style={styles.currentPlanButton} disabled>
                        <Text style={styles.currentPlanButtonText}>Current Plan</Text>
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
                          {plan.status === 'ACTIVE' ? 'Subscribe Now' : 'Not Available'}
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
            <Text style={styles.infoTitle}>Subscription Information</Text>
            <Text style={styles.infoText}>
              You can upgrade or downgrade your plan at any time. Changes will be reflected immediately, and billing
              will be prorated. Cancel anytime with no long-term commitment.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscribe to Plan</Text>
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
                      <Text style={styles.selectedPlanName}>Selected Plan: {selectedPlan.name}</Text>
                      <Text style={styles.selectedPlanPrice}>
                        Price: {formatPrice(selectedPlan.price)} {formatDuration(selectedPlan.duration)}
                      </Text>
                    </View>

                    <Text style={styles.paymentMethodTitle}>Payment Method</Text>
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
                        <Text style={styles.paymentMethodText}>Dummy Payment</Text>
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
                        <Text style={styles.paymentMethodText}>Credit/Debit Card</Text>
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
                        <Text style={styles.paymentMethodText}>PayPal</Text>
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
                        <Text style={styles.paymentMethodText}>Bank Transfer</Text>
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
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title={buySubscriptionMutation.isPending ? 'Processing...' : 'Pay Now'}
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
