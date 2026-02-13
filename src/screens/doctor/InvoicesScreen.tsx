import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as paymentApi from '../../services/payment';
import { API_BASE_URL } from '../../config/api';
import { useTranslation } from 'react-i18next';

const defaultAvatar = require('../../../assets/avatar.png');

/**
 * Normalize image URL for mobile app
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.1.11';
  }
  
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

/**
 * Format date
 */
/**
 * Get status color
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SUCCESS':
      return colors.success;
    case 'PENDING':
      return colors.warning;
    case 'FAILED':
      return colors.error;
    case 'REFUNDED':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
};

export const InvoicesScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<paymentApi.Transaction | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [refreshing, setRefreshing] = useState(false);

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return t('common.na');
    const d = new Date(date);
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date: string | null | undefined, time?: string): string => {
    if (!date) return t('common.na');
    const d = new Date(date);
    const dateStr = d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
    return time ? `${dateStr} ${time}` : dateStr;
  };

  const formatCurrency = (amount: number | null | undefined, currency: string = 'USD'): string => {
    if (amount === null || amount === undefined) return t('common.na');
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getTransactionType = (transaction: paymentApi.Transaction): string => {
    if (transaction.relatedAppointmentId) return t('more.invoices.transactionTypes.appointment');
    if (transaction.relatedSubscriptionId) return t('more.invoices.transactionTypes.subscription');
    if (transaction.relatedProductId) return t('more.invoices.transactionTypes.product');
    return t('more.invoices.transactionTypes.other');
  };

  const getStatusLabel = (status: string | undefined | null): string => {
    const s = String(status || '').toUpperCase();
    if (s === 'SUCCESS') return t('more.invoices.status.success');
    if (s === 'PENDING') return t('more.invoices.status.pending');
    if (s === 'FAILED') return t('more.invoices.status.failed');
    if (s === 'REFUNDED') return t('more.invoices.status.refunded');
    return status ? String(status) : t('common.na');
  };

  // Fetch transactions (subscription payments where userId = doctorId)
  const { data: transactionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorTransactions', page],
    queryFn: () => paymentApi.getTransactions({ page, limit }),
    enabled: !!user,
  });

  // Extract transactions from response
  const transactions = useMemo(() => {
    if (!transactionsData?.data) return [];
    return transactionsData.data.transactions || [];
  }, [transactionsData]);

  // Get pagination info
  const pagination = useMemo(() => {
    if (!transactionsData?.data) return null;
    return transactionsData.data.pagination || null;
  }, [transactionsData]);

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((transaction) => {
        const transactionId = (transaction._id || '').toLowerCase();
        const patientName =
          transaction.relatedAppointmentId?.patientId?.fullName?.toLowerCase() || '';
        const appointmentNumber =
          (transaction.relatedAppointmentId?.appointmentNumber || '').toLowerCase();
        const provider = (transaction.provider || '').toLowerCase();
        const providerRef = (transaction.providerReference || '').toLowerCase();

        return (
          transactionId.includes(query) ||
          patientName.includes(query) ||
          appointmentNumber.includes(query) ||
          provider.includes(query) ||
          providerRef.includes(query)
        );
      });
    }

    return filtered;
  }, [transactions, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleViewTransaction = async (transaction: paymentApi.Transaction) => {
    setSelectedTransaction(transaction);
    setShowInvoiceModal(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
      setPage(newPage);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.invoices.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('more.invoices.errorTitle')}</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message || (error as any)?.message || t('more.invoices.errorBody')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('screens.invoices')}</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('more.invoices.doctorSearchPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>{t('more.invoices.empty')}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? t('more.invoices.emptySearchHint') : t('more.invoices.emptyHint')}
            </Text>
          </View>
        ) : (
          <>
            {filteredTransactions.map((transaction) => {
              const patientImage = normalizeImageUrl(
                transaction.relatedAppointmentId?.patientId?.profileImage
              );
              const patientName =
                transaction.relatedAppointmentId?.patientId?.fullName || t('common.na');
              const appointmentNumber =
                transaction.relatedAppointmentId?.appointmentNumber || t('common.na');

              return (
                <TouchableOpacity
                  key={transaction._id}
                  style={styles.transactionCard}
                  onPress={() => handleViewTransaction(transaction)}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIdContainer}>
                      <Text style={styles.transactionId}>#{transaction._id.slice(-8).toUpperCase()}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(transaction.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: getStatusColor(transaction.status) }]}
                        >
                          {getStatusLabel(transaction.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.transactionType}>{getTransactionType(transaction)}</Text>
                  </View>

                  {transaction.relatedAppointmentId && (
                    <View style={styles.patientInfo}>
                      <Image
                        source={patientImage ? { uri: patientImage } : defaultAvatar}
                        style={styles.patientAvatar}
                      />
                      <View style={styles.patientDetails}>
                        <Text style={styles.patientName}>{patientName}</Text>
                        <Text style={styles.appointmentNumber}>
                          {t('more.invoices.labels.appointmentLabel')} {appointmentNumber}
                        </Text>
                        {transaction.relatedAppointmentId.appointmentDate && (
                          <Text style={styles.appointmentDate}>
                            {formatDateTime(
                              transaction.relatedAppointmentId.appointmentDate,
                              transaction.relatedAppointmentId.appointmentTime
                            )}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={styles.transactionFooter}>
                    <View>
                      <Text style={styles.footerLabel}>{t('more.invoices.labels.transactionDate')}</Text>
                      <Text style={styles.footerValue}>{formatDate(transaction.createdAt)}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={styles.amountLabel}>{t('more.invoices.labels.amountNoColon')}</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                  onPress={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <Text
                    style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}
                  >
                    {t('common.prev')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  {t('more.invoices.pagination.pageOf', { current: page, total: pagination.pages })}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    page === pagination.pages && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => handlePageChange(page + 1)}
                  disabled={page === pagination.pages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      page === pagination.pages && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    {t('common.next')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Invoice Detail Modal */}
      <Modal
        visible={showInvoiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('more.invoices.invoiceDetails')}</Text>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedTransaction && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.transactionIdNoColon')}</Text>
                  <Text style={styles.invoiceValue}>#{selectedTransaction._id.slice(-8).toUpperCase()}</Text>
                </View>
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.type')}</Text>
                  <Text style={styles.invoiceValue}>{getTransactionType(selectedTransaction)}</Text>
                </View>
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.statusNoColon')}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedTransaction.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(selectedTransaction.status) },
                      ]}
                    >
                      {getStatusLabel(selectedTransaction.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.amountNoColon')}</Text>
                  <Text style={styles.invoiceValue}>
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </Text>
                </View>
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.paymentProvider')}</Text>
                  <Text style={styles.invoiceValue}>{selectedTransaction.provider || t('common.na')}</Text>
                </View>
                {selectedTransaction.providerReference && (
                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceLabel}>{t('more.invoices.labels.providerReferenceNoColon')}</Text>
                    <Text style={styles.invoiceValue}>{selectedTransaction.providerReference}</Text>
                  </View>
                )}
                {selectedTransaction.relatedAppointmentId && (
                  <>
                    <View style={styles.invoiceSection}>
                      <Text style={styles.invoiceLabel}>{t('more.invoices.labels.appointmentNumberOnly')}</Text>
                      <Text style={styles.invoiceValue}>
                        {selectedTransaction.relatedAppointmentId.appointmentNumber}
                      </Text>
                    </View>
                    <View style={styles.invoiceSection}>
                      <Text style={styles.invoiceLabel}>{t('more.invoices.labels.patient')}</Text>
                      <Text style={styles.invoiceValue}>
                        {selectedTransaction.relatedAppointmentId.patientId?.fullName || t('common.na')}
                      </Text>
                    </View>
                    {selectedTransaction.relatedAppointmentId.appointmentDate && (
                      <View style={styles.invoiceSection}>
                        <Text style={styles.invoiceLabel}>{t('more.invoices.labels.appointmentDate')}</Text>
                        <Text style={styles.invoiceValue}>
                          {formatDateTime(
                            selectedTransaction.relatedAppointmentId.appointmentDate,
                            selectedTransaction.relatedAppointmentId.appointmentTime
                          )}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceLabel}>{t('more.invoices.labels.transactionDate')}</Text>
                  <Text style={styles.invoiceValue}>{formatDate(selectedTransaction.createdAt)}</Text>
                </View>
              </ScrollView>
            )}
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
  header: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },
  content: {
    flex: 1,
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
  transactionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  appointmentNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 13,
    color: colors.text,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: colors.textWhite,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationText: {
    fontSize: 14,
    color: colors.text,
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
  invoiceSection: {
    marginBottom: 16,
  },
  invoiceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  invoiceValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});

