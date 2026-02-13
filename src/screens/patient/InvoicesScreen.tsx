import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as paymentApi from '../../services/payment';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
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
    deviceHost = match ? match[1] : '192.168.0.114';
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

export const InvoicesScreen = () => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewTransaction, setViewTransaction] = useState<paymentApi.Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch payment history
  const {
    data: paymentHistoryResponse,
    isLoading,
    refetch,
  } = useQuery<paymentApi.TransactionsResponse>({
    queryKey: ['patientPaymentHistory', statusFilter, currentPage],
    queryFn: () =>
      paymentApi.getPatientPaymentHistory({
        status: statusFilter || undefined,
        page: currentPage,
        limit: 20,
      }),
  });

  // Extract transactions and pagination
  const paymentHistoryData = paymentHistoryResponse?.data;
  const transactions = paymentHistoryData?.transactions || [];
  const pagination = paymentHistoryData?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter((transaction) => {
      const doctor = transaction.relatedAppointmentId?.doctorId;
      const doctorName =
        transaction.doctorName ||
        (doctor && typeof doctor === 'object' ? doctor.fullName : '') ||
        '';
      const appointmentNumber = transaction.relatedAppointmentId?.appointmentNumber || '';
      const transactionId = transaction._id || '';
      return (
        doctorName.toLowerCase().includes(query) ||
        appointmentNumber.toLowerCase().includes(query) ||
        transactionId.toLowerCase().includes(query)
      );
    });
  }, [transactions, searchQuery]);

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return t('common.na');
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    const safeAmount = amount === undefined || amount === null ? 0 : amount;
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(safeAmount);
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      SUCCESS: colors.success,
      PENDING: colors.warning,
      FAILED: colors.error,
      REFUNDED: colors.info || colors.primary,
    };
    return colorsMap[status] || colors.textSecondary;
  };

  // Get transaction type
  const getTransactionType = (transaction: paymentApi.Transaction) => {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderTransactionItem = ({ item: transaction }: { item: paymentApi.Transaction }) => {
    const doctor = transaction.relatedAppointmentId?.doctorId;
    const doctorName =
      transaction.doctorName ||
      (doctor && typeof doctor === 'object' && doctor !== null ? doctor.fullName : '') ||
      t('common.na');
    const doctorImage =
      doctor && typeof doctor === 'object' && doctor !== null ? doctor.profileImage : null;
    const normalizedImageUrl = normalizeImageUrl(doctorImage);
    const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
    const appointmentDate = transaction.relatedAppointmentId?.appointmentDate;
    const appointmentNumber = transaction.relatedAppointmentId?.appointmentNumber;
    const transactionId = `#${transaction._id.slice(-8).toUpperCase()}`;

    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <View style={styles.doctorInfo}>
            <Image source={imageSource} style={styles.doctorImage} defaultSource={defaultAvatar} />
            <View style={styles.doctorDetails}>
              <TouchableOpacity onPress={() => setViewTransaction(transaction)}>
                <Text style={styles.invoiceId}>{transactionId}</Text>
              </TouchableOpacity>
              <Text style={styles.doctorName}>{doctorName}</Text>
              <View style={styles.typeBadge}>
                <View style={[styles.badge, { backgroundColor: colors.info || colors.primary }]}>
                  <Text style={styles.badgeText}>{getTransactionType(transaction)}</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.amount}>{formatCurrency(transaction.amount, transaction.currency)}</Text>
        </View>

        <View style={styles.invoiceDetails}>
          {appointmentDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('more.invoices.labels.appointmentDate')}</Text>
              <Text style={styles.detailValue}>{formatDate(appointmentDate)}</Text>
            </View>
          )}
          {appointmentNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('more.invoices.labels.appointmentNumber')}</Text>
              <Text style={styles.detailValue}>#{appointmentNumber}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('more.invoices.labels.paymentDate')}</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('more.invoices.labels.status')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(transaction.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusLabel(transaction.status)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.invoiceActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setViewTransaction(transaction)}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>{t('common.view')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: t('common.download'),
                text2: t('more.invoices.toasts.downloadNotAvailable'),
              });
            }}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>{t('common.download')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('more.invoices.searchPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          <View style={styles.filterSelect}>
            <Ionicons name="filter-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.filterSelectText}>
              {statusFilter ? getStatusLabel(statusFilter) : t('more.invoices.filters.allStatus')}
            </Text>
          </View>
          <Modal
            visible={false}
            transparent
            animationType="slide"
            onRequestClose={() => {}}
          >
            {/* Filter modal would go here */}
          </Modal>
        </View>
      </View>

      {/* Status Filter Buttons */}
      <View style={styles.statusFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilterScroll}>
          <TouchableOpacity
            style={[styles.statusFilterButton, !statusFilter && styles.statusFilterButtonActive]}
            onPress={() => {
              setStatusFilter('');
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.statusFilterText, !statusFilter && styles.statusFilterTextActive]}>
              {t('more.notifications.filters.all')}
            </Text>
          </TouchableOpacity>
          {['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusFilterButton, statusFilter === status && styles.statusFilterButtonActive]}
              onPress={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.statusFilterText, statusFilter === status && styles.statusFilterTextActive]}>
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      {isLoading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.invoices.loading')}</Text>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>{t('more.invoices.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item._id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Text
                    style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}
                  >
                    {t('common.prev')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  {t('more.invoices.pagination.pageOf', { current: currentPage, total: pagination.pages })}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === pagination.pages && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => currentPage < pagination.pages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === pagination.pages && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    {t('common.next')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* View Transaction Modal */}
      {viewTransaction && (
        <Modal visible={!!viewTransaction} transparent animationType="slide" onRequestClose={() => setViewTransaction(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('more.invoices.transactionDetails')}</Text>
                <TouchableOpacity onPress={() => setViewTransaction(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.transactionId')}</Text>
                  <Text style={styles.viewTransactionText}>#{viewTransaction._id.slice(-8).toUpperCase()}</Text>
                </View>
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.status')}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadgeColor(viewTransaction.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{getStatusLabel(viewTransaction.status)}</Text>
                  </View>
                </View>
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.transactionType')}</Text>
                  <Text style={styles.viewTransactionText}>{getTransactionType(viewTransaction)}</Text>
                </View>
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.amount')}</Text>
                  <Text style={[styles.viewTransactionText, styles.amountText]}>
                    {formatCurrency(viewTransaction.amount, viewTransaction.currency)}
                  </Text>
                </View>
                {viewTransaction.relatedAppointmentId && (
                  <>
                    <View style={styles.viewTransactionItem}>
                      <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.appointmentNumberOnly')}</Text>
                      <Text style={styles.viewTransactionText}>
                        {viewTransaction.relatedAppointmentId.appointmentNumber || t('common.na')}
                      </Text>
                    </View>
                    <View style={styles.viewTransactionItem}>
                      <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.appointmentDate')}</Text>
                      <Text style={styles.viewTransactionText}>
                        {formatDate(viewTransaction.relatedAppointmentId.appointmentDate)}
                      </Text>
                    </View>
                    {viewTransaction.relatedAppointmentId.doctorId && (
                      <View style={styles.viewTransactionItem}>
                        <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.doctor')}</Text>
                        <Text style={styles.viewTransactionText}>
                          {typeof viewTransaction.relatedAppointmentId.doctorId === 'object' &&
                          viewTransaction.relatedAppointmentId.doctorId !== null
                            ? viewTransaction.relatedAppointmentId.doctorId.fullName
                            : t('common.na')}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.paymentDate')}</Text>
                  <Text style={styles.viewTransactionText}>{formatDate(viewTransaction.createdAt)}</Text>
                </View>
                <View style={styles.viewTransactionItem}>
                  <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.paymentMethod')}</Text>
                  <Text style={styles.viewTransactionText}>{viewTransaction.provider || t('common.na')}</Text>
                </View>
                {viewTransaction.providerReference && (
                  <View style={styles.viewTransactionItem}>
                    <Text style={styles.viewTransactionLabel}>{t('more.invoices.labels.providerReference')}</Text>
                    <Text style={styles.viewTransactionText}>{viewTransaction.providerReference}</Text>
                  </View>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setViewTransaction(null)}>
                  <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: t('more.invoices.actions.print'),
                      text2: t('more.invoices.toasts.printNotAvailable'),
                    });
                  }}
                >
                  <Text style={styles.printButtonText}>{t('more.invoices.actions.printInvoice')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  headerContainer: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterSelectText: {
    fontSize: 14,
    color: colors.text,
  },
  statusFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statusFilterScroll: {
    gap: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 16,
  },
  invoiceCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  invoiceDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
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
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  viewTransactionItem: {
    marginBottom: 16,
  },
  viewTransactionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  viewTransactionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  printButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
