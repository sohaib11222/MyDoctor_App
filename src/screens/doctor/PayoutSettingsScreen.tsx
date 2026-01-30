import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import * as balanceApi from '../../services/balance';
import Toast from 'react-native-toast-message';

export const PayoutSettingsScreen = () => {
  const queryClient = useQueryClient();
  const [withdrawModal, setWithdrawModal] = useState({
    show: false,
    amount: '',
    paymentMethod: 'STRIPE' as 'STRIPE' | 'BANK' | 'PAYPAL',
    paymentDetails: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch user balance
  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['userBalance'],
    queryFn: () => balanceApi.getBalance(),
  });

  // Fetch withdrawal requests
  const { data: withdrawalData, isLoading: withdrawalLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['withdrawalRequests', currentPage],
    queryFn: () => balanceApi.getWithdrawalRequests({ page: currentPage, limit: 10 }),
  });

  const balance = useMemo(() => {
    if (!balanceData) return 0;
    const data = balanceData?.data || balanceData;
    return data?.balance || 0;
  }, [balanceData]);

  const withdrawals = useMemo(() => {
    if (!withdrawalData) return [];
    const data = withdrawalData?.data || withdrawalData;
    return data?.requests || [];
  }, [withdrawalData]);

  const pagination = useMemo(() => {
    if (!withdrawalData) return { total: 0, pages: 1, page: 1, limit: 10 };
    const data = withdrawalData?.data || withdrawalData;
    return data?.pagination || { total: 0, pages: 1, page: 1, limit: 10 };
  }, [withdrawalData]);

  // Request withdrawal mutation
  const requestWithdrawalMutation = useMutation({
    mutationFn: ({ amount, paymentMethod, paymentDetails }: { amount: number; paymentMethod: 'STRIPE' | 'BANK' | 'PAYPAL'; paymentDetails: string }) =>
      balanceApi.requestWithdrawal(amount, paymentMethod, paymentDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userBalance'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Withdrawal request submitted successfully!',
      });
      setWithdrawModal({ show: false, amount: '', paymentMethod: 'STRIPE', paymentDetails: '' });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit withdrawal request';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get status badge
  const getStatusBadge = (status: string | null | undefined) => {
    const statusUpper = (status || '').toUpperCase();

    if (statusUpper === 'APPROVED' || statusUpper === 'COMPLETED') {
      return (
        <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
          <Text style={styles.statusBadgeText}>
            {statusUpper === 'APPROVED' ? 'Approved' : 'Completed'}
          </Text>
        </View>
      );
    }

    if (statusUpper === 'PENDING') {
      return (
        <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextDark]}>Pending</Text>
        </View>
      );
    }

    if (statusUpper === 'REJECTED') {
      return (
        <View style={[styles.statusBadge, styles.statusBadgeDanger]}>
          <Text style={styles.statusBadgeText}>Rejected</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, styles.statusBadgeSecondary]}>
        <Text style={styles.statusBadgeText}>{status || '—'}</Text>
      </View>
    );
  };

  // Handle withdrawal request
  const handleWithdrawRequest = () => {
    const amount = parseFloat(withdrawModal.amount);
    if (!amount || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid amount',
      });
      return;
    }
    if (amount > balance) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Insufficient balance',
      });
      return;
    }
    if (!withdrawModal.paymentDetails.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter payment details',
      });
      return;
    }

    requestWithdrawalMutation.mutate({
      amount,
      paymentMethod: withdrawModal.paymentMethod,
      paymentDetails: withdrawModal.paymentDetails.trim(),
    });
  };

  const handleRefresh = async () => {
    await Promise.all([refetchBalance(), refetchWithdrawals()]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={balanceLoading || withdrawalLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Settings Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <Text style={styles.cardSubtitle}>All the earning will be sent to below selected payout method</Text>

          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodIcon}>
              <Ionicons name="card-outline" size={32} color={colors.primary} />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodName}>Stripe</Text>
              <Text style={styles.paymentMethodDescription}>Configure your Stripe account</Text>
            </View>
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => setWithdrawModal({ ...withdrawModal, show: true, paymentMethod: 'STRIPE' })}
            >
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={styles.configureButtonText}>Configure</Text>
            </TouchableOpacity>
          </View>

          {/* Available Balance */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>€{balance.toFixed(2)}</Text>
            </View>
            <Button
              title="Request Withdrawal"
              onPress={() => setWithdrawModal({ ...withdrawModal, show: true })}
              disabled={balance <= 0}
              style={styles.withdrawButton}
            />
          </View>
        </View>

        {/* Payouts Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payouts</Text>

          {withdrawalLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : withdrawals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No withdrawal requests found</Text>
            </View>
          ) : (
            <>
              {withdrawals.map((withdrawal) => (
                <View key={withdrawal._id} style={styles.withdrawalCard}>
                  <View style={styles.withdrawalHeader}>
                    <Text style={styles.withdrawalDate}>
                      {formatDate(withdrawal.createdAt)}
                    </Text>
                    {getStatusBadge(withdrawal.status)}
                  </View>
                  <View style={styles.withdrawalDetails}>
                    <View style={styles.withdrawalRow}>
                      <Text style={styles.withdrawalLabel}>Payment Method:</Text>
                      <Text style={styles.withdrawalValue}>{withdrawal.paymentMethod || '—'}</Text>
                    </View>
                    <View style={styles.withdrawalRow}>
                      <Text style={styles.withdrawalLabel}>Amount:</Text>
                      <Text style={styles.withdrawalAmount}>€{(withdrawal.amount || 0).toFixed(2)}</Text>
                    </View>
                    {(withdrawal as any).netAmount !== null &&
                      (withdrawal as any).netAmount !== undefined &&
                      (withdrawal as any).netAmount !== withdrawal.amount && (
                        <View style={styles.withdrawalRow}>
                          <Text style={styles.withdrawalLabel}>You receive:</Text>
                          <Text style={styles.withdrawalValue}>
                            €{(withdrawal as any).netAmount.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    {(withdrawal as any).withdrawalFeePercent !== null &&
                      (withdrawal as any).withdrawalFeePercent !== undefined && (
                        <View style={styles.withdrawalRow}>
                          <Text style={styles.withdrawalLabel}>Fee:</Text>
                          <Text style={styles.withdrawalValue}>
                            {(withdrawal as any).withdrawalFeePercent}%
                            {(withdrawal as any).withdrawalFeeAmount !== null &&
                              (withdrawal as any).withdrawalFeeAmount !== undefined && (
                                <Text style={styles.withdrawalFeeAmount}>
                                  {' '}
                                  (€{(withdrawal as any).withdrawalFeeAmount.toFixed(2)})
                                </Text>
                              )}
                          </Text>
                        </View>
                      )}
                  </View>
                </View>
              ))}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={currentPage === 1 ? colors.textLight : colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.paginationText}>
                    Page {currentPage} of {pagination.pages}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === pagination.pages && styles.paginationButtonDisabled,
                    ]}
                    onPress={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={currentPage === pagination.pages ? colors.textLight : colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Withdrawal Request Modal */}
      <Modal
        visible={withdrawModal.show}
        transparent
        animationType="slide"
        onRequestClose={() => setWithdrawModal({ show: false, amount: '', paymentMethod: 'STRIPE', paymentDetails: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Withdrawal</Text>
              <TouchableOpacity
                onPress={() => setWithdrawModal({ show: false, amount: '', paymentMethod: 'STRIPE', paymentDetails: '' })}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Available Balance</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputDisabled]}
                  value={`€${balance.toFixed(2)}`}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Amount to Withdraw <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={withdrawModal.amount}
                  onChangeText={(text) => setWithdrawModal({ ...withdrawModal, amount: text })}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Payment Method <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.paymentMethodSelector}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      withdrawModal.paymentMethod === 'STRIPE' && styles.paymentMethodOptionActive,
                    ]}
                    onPress={() => setWithdrawModal({ ...withdrawModal, paymentMethod: 'STRIPE' })}
                  >
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={withdrawModal.paymentMethod === 'STRIPE' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodOptionText,
                        withdrawModal.paymentMethod === 'STRIPE' && styles.paymentMethodOptionTextActive,
                      ]}
                    >
                      Stripe
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      withdrawModal.paymentMethod === 'BANK' && styles.paymentMethodOptionActive,
                    ]}
                    onPress={() => setWithdrawModal({ ...withdrawModal, paymentMethod: 'BANK' })}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={withdrawModal.paymentMethod === 'BANK' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodOptionText,
                        withdrawModal.paymentMethod === 'BANK' && styles.paymentMethodOptionTextActive,
                      ]}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Payment Details <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.formHint}>
                  {withdrawModal.paymentMethod === 'STRIPE' &&
                    'Enter Stripe account details (Account ID or email)'}
                  {withdrawModal.paymentMethod === 'BANK' && 'Enter bank account details'}
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={withdrawModal.paymentDetails}
                  onChangeText={(text) => setWithdrawModal({ ...withdrawModal, paymentDetails: text })}
                  placeholder="Enter payment details..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setWithdrawModal({ show: false, amount: '', paymentMethod: 'STRIPE', paymentDetails: '' })}
                variant="outline"
                style={styles.modalButton}
                disabled={requestWithdrawalMutation.isPending}
              />
              <Button
                title={requestWithdrawalMutation.isPending ? 'Submitting...' : 'Submit Request'}
                onPress={handleWithdrawRequest}
                style={styles.modalButton}
                disabled={
                  requestWithdrawalMutation.isPending ||
                  !withdrawModal.amount ||
                  !withdrawModal.paymentDetails.trim()
                }
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
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  configureButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 8,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  withdrawButton: {
    minWidth: 140,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  withdrawalCard: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  withdrawalDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  withdrawalDetails: {
    gap: 8,
  },
  withdrawalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  withdrawalValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  withdrawalFeeAmount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.success,
  },
  statusBadgeWarning: {
    backgroundColor: colors.warning,
  },
  statusBadgeDanger: {
    backgroundColor: colors.error,
  },
  statusBadgeSecondary: {
    backgroundColor: colors.textSecondary,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  statusBadgeTextDark: {
    color: colors.text,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
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
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  formHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.backgroundLight,
  },
  formInputDisabled: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.6,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
    gap: 8,
  },
  paymentMethodOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentMethodOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentMethodOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
  },
});
