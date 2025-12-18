import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular: boolean;
  current: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$29',
    period: 'per month',
    features: [
      'Up to 50 appointments/month',
      'Basic profile listing',
      'Email support',
      'Basic analytics',
      'Mobile app access',
    ],
    popular: false,
    current: true,
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    price: '$79',
    period: 'per month',
    features: [
      'Unlimited appointments',
      'Featured profile listing',
      'Priority support',
      'Advanced analytics',
      'Video consultations',
      'Custom branding',
      'API access',
    ],
    popular: true,
    current: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: '$199',
    period: 'per month',
    features: [
      'Unlimited everything',
      'Premium placement',
      '24/7 dedicated support',
      'Custom integrations',
      'White-label solution',
      'Multi-location support',
      'Advanced reporting',
      'Team management',
    ],
    popular: false,
    current: false,
  },
];

export const SubscriptionPlansScreen = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    // TODO: Integrate with payment gateway
    Alert.alert('Success', 'Payment processed successfully! Your subscription has been upgraded.');
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  const currentPlan = plans.find((p) => p.current);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Plan Info */}
        {currentPlan && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanContent}>
              <View>
                <Text style={styles.currentPlanTitle}>Current Plan: {currentPlan.name}</Text>
                <Text style={styles.currentPlanSubtitle}>Renews on: 15 Dec 2024</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.popular && styles.popularPlanCard,
                plan.current && styles.currentPlanCardStyle,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}
              {plan.current && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current Plan</Text>
                </View>
              )}
              <View style={styles.planContent}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.pricing}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {plan.current ? (
                  <TouchableOpacity style={styles.currentPlanButton} disabled>
                    <Text style={styles.currentPlanButtonText}>Current Plan</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.upgradeButton, plan.popular && styles.popularUpgradeButton]}
                    onPress={() => handleUpgrade(plan.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.upgradeButtonText,
                        plan.popular && styles.popularUpgradeButtonText,
                      ]}
                    >
                      {plan.id === 'basic' ? 'Downgrade' : 'Upgrade Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Info Alert */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Subscription Information</Text>
            <Text style={styles.infoText}>
              You can upgrade or downgrade your plan at any time. Changes will be reflected immediately,
              and billing will be prorated. Cancel anytime with no long-term commitment.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upgrade Subscription</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.selectedPlanInfo}>
                  <Text style={styles.selectedPlanName}>
                    Selected Plan: {plans.find((p) => p.id === selectedPlan)?.name}
                  </Text>
                  <Text style={styles.selectedPlanPrice}>
                    Price: {plans.find((p) => p.id === selectedPlan)?.price}{' '}
                    {plans.find((p) => p.id === selectedPlan)?.period}
                  </Text>
                </View>

                <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === 'card' && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod('card')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="card" size={20} color={colors.primary} />
                    <Text style={styles.paymentMethodText}>Credit/Debit Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === 'paypal' && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod('paypal')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-paypal" size={20} color={colors.primary} />
                    <Text style={styles.paymentMethodText}>PayPal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === 'bank' && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod('bank')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="business" size={20} color={colors.primary} />
                    <Text style={styles.paymentMethodText}>Bank Transfer</Text>
                  </TouchableOpacity>
                </View>

                {paymentMethod === 'card' && (
                  <View style={styles.cardDetails}>
                    <Input placeholder="Card Number" />
                    <View style={styles.cardRow}>
                      <Input placeholder="MM/YY" style={styles.halfInput} />
                      <Input placeholder="CVV" style={styles.halfInput} />
                    </View>
                    <Input placeholder="Cardholder Name" />
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Pay Now"
                onPress={handlePayment}
                style={styles.payButton}
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
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
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
    marginBottom: 12,
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
  cardDetails: {
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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

