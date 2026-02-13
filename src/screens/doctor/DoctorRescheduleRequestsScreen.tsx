import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as rescheduleApi from '../../services/rescheduleRequest';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type DoctorRescheduleRequestsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'DoctorRescheduleRequests'>;

const DoctorRescheduleRequestsScreen = () => {
  const navigation = useNavigation<DoctorRescheduleRequestsScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState<rescheduleApi.RescheduleRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleFee, setRescheduleFee] = useState('');
  const [rescheduleFeePercentage, setRescheduleFeePercentage] = useState(50);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch pending reschedule requests
  const { data: requestsData, isLoading, error: requestsError } = useQuery({
    queryKey: ['doctorRescheduleRequests'],
    queryFn: () => rescheduleApi.listRescheduleRequests({ status: 'PENDING' }),
    enabled: !!user,
    retry: 1,
  });

  const requests = requestsData || [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (data: rescheduleApi.ApproveRescheduleRequestData) =>
      rescheduleApi.approveRescheduleRequest(selectedRequest!._id, data),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: t('more.doctorRescheduleRequests.toasts.requestApprovedTitle'),
        text2: t('more.doctorRescheduleRequests.toasts.requestApprovedBody'),
      });
      queryClient.invalidateQueries({ queryKey: ['doctorRescheduleRequests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowApproveModal(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Approve reschedule error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Request data sent:', error?.config?.data);
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.doctorRescheduleRequests.errors.failedToApprove');
      const validationErrors = error?.response?.data?.errors;
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: validationErrors ? JSON.stringify(validationErrors) : errorMessage,
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (rejectionReason: string) =>
      rescheduleApi.rejectRescheduleRequest(selectedRequest!._id, rejectionReason),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: t('more.doctorRescheduleRequests.toasts.requestRejectedTitle'),
        text2: t('more.doctorRescheduleRequests.toasts.requestRejectedBody'),
      });
      queryClient.invalidateQueries({ queryKey: ['doctorRescheduleRequests'] });
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.doctorRescheduleRequests.errors.failedToReject');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  const handleApprove = () => {
    if (!newDate || !newTime) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('more.doctorRescheduleRequests.validation.selectNewDateTime'),
      });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate.trim())) {
      Toast.show({
        type: 'error',
        text1: t('more.doctorRescheduleRequests.validation.invalidDateFormatTitle'),
        text2: t('more.doctorRescheduleRequests.validation.invalidDateFormatBody'),
      });
      return;
    }

    // Validate and normalize time format (HH:MM) - ensure 2-digit hours
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const trimmedTime = newTime.trim();
    if (!timeRegex.test(trimmedTime)) {
      Toast.show({
        type: 'error',
        text1: t('more.doctorRescheduleRequests.validation.invalidTimeFormatTitle'),
        text2: t('more.doctorRescheduleRequests.validation.invalidTimeFormatBody'),
      });
      return;
    }

    // Normalize time to always have 2-digit hours (e.g., "9:30" -> "09:30")
    const [hours, minutes] = trimmedTime.split(':');
    const normalizedTime = `${hours.padStart(2, '0')}:${minutes}`;

    // Validate date is a valid date
    const trimmedDate = newDate.trim();
    const dateObj = new Date(trimmedDate);
    if (isNaN(dateObj.getTime())) {
      Toast.show({
        type: 'error',
        text1: t('more.doctorRescheduleRequests.validation.invalidDateTitle'),
        text2: t('more.doctorRescheduleRequests.validation.invalidDateBody'),
      });
      return;
    }

    // Ensure rescheduleFeePercentage is a valid number (default to 50 if invalid)
    const feePercentage = Number(rescheduleFeePercentage);
    const validFeePercentage = (!isNaN(feePercentage) && feePercentage >= 0 && feePercentage <= 100) 
      ? feePercentage 
      : 50;

    // Build approval payload - always include rescheduleFeePercentage like web version
    const approvalData: rescheduleApi.ApproveRescheduleRequestData = {
      newAppointmentDate: trimmedDate,
      newAppointmentTime: normalizedTime,
      rescheduleFeePercentage: validFeePercentage, // Always send, ensure it's a number
    };

    // Only add rescheduleFee if it has a value (fixed amount) - this overrides percentage
    if (rescheduleFee && rescheduleFee.trim()) {
      const fee = parseFloat(rescheduleFee.trim());
      if (!isNaN(fee) && fee >= 0) {
        approvalData.rescheduleFee = fee;
      } else {
        Toast.show({
          type: 'error',
          text1: t('more.doctorRescheduleRequests.validation.invalidFeeAmountTitle'),
          text2: t('more.doctorRescheduleRequests.validation.invalidFeeAmountBody'),
        });
        return;
      }
    }

    // Only add doctorNotes if it has a value
    if (doctorNotes && doctorNotes.trim()) {
      if (doctorNotes.trim().length > 500) {
        Toast.show({
          type: 'error',
          text1: t('more.doctorRescheduleRequests.validation.notesTooLongTitle'),
          text2: t('more.doctorRescheduleRequests.validation.notesTooLongBody'),
        });
        return;
      }
      approvalData.doctorNotes = doctorNotes.trim();
    }

    // Log the payload for debugging
    if (__DEV__) {
      console.log('🔍 Approving reschedule request with data:', JSON.stringify(approvalData, null, 2));
      console.log('🔍 Request ID:', selectedRequest?._id);
    }

    approveMutation.mutate(approvalData);
  };

  const handleReject = () => {
    if (rejectionReason.trim().length < 10) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('more.doctorRescheduleRequests.validation.rejectionReasonMin10'),
      });
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  const calculateFee = () => {
    if (!selectedRequest) return 0;
    const originalFee = selectedRequest.originalAppointmentFee || 0;
    if (rescheduleFee && rescheduleFee.trim()) {
      return Math.min(parseFloat(rescheduleFee), originalFee);
    }
    return (originalFee * rescheduleFeePercentage) / 100;
  };

  const resetForm = () => {
    setNewDate('');
    setNewTime('');
    setRescheduleFee('');
    setRescheduleFeePercentage(50);
    setDoctorNotes('');
    setSelectedRequest(null);
  };

  const openApproveModal = (request: rescheduleApi.RescheduleRequest) => {
    setSelectedRequest(request);
    if (request.preferredDate) {
      const date = new Date(request.preferredDate);
      setNewDate(date.toISOString().split('T')[0]);
    }
    if (request.preferredTime) {
      setNewTime(request.preferredTime);
    }
    setShowApproveModal(true);
  };

  const openRejectModal = (request: rescheduleApi.RescheduleRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('more.doctorRescheduleRequests.loadingRequests')}</Text>
          </View>
        ) : requestsError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
            <Text style={styles.errorTitle}>{t('more.doctorRescheduleRequests.error.unableToLoadTitle')}</Text>
            <Text style={styles.errorText}>
              {requestsError?.response?.status === 404
                ? t('more.doctorRescheduleRequests.error.featureNotAvailable')
                : requestsError?.response?.data?.message ||
                  requestsError?.message ||
                  t('more.doctorRescheduleRequests.error.generic')}
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{t('more.doctorRescheduleRequests.empty.noPending')}</Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => (
              <View key={request._id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>
                    {t('more.doctorRescheduleRequests.requestFrom', {
                      name: request.appointmentId?.patientId?.fullName || t('common.patient'),
                    })}
                  </Text>
                </View>

                <View style={styles.requestContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('more.doctorRescheduleRequests.labels.originalAppointment')}</Text>
                    <Text style={styles.detailText}>
                      {request.appointmentId ? (
                        <>
                          {new Date(request.appointmentId.appointmentDate).toLocaleDateString(i18n.language)}{' '}
                          {t('more.doctorRescheduleRequests.atTime', { time: request.appointmentId.appointmentTime })}
                          {request.appointmentId.appointmentNumber && (
                            <> (#{request.appointmentId.appointmentNumber})</>
                          )}
                        </>
                      ) : (
                        t('common.na')
                      )}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('more.doctorRescheduleRequests.labels.reason')}</Text>
                    <Text style={styles.detailText}>{request.reason}</Text>
                  </View>

                  {request.preferredDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('more.doctorRescheduleRequests.labels.preferredDate')}</Text>
                      <Text style={styles.detailText}>
                        {new Date(request.preferredDate).toLocaleDateString(i18n.language)}
                      </Text>
                    </View>
                  )}

                  {request.preferredTime && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('more.doctorRescheduleRequests.labels.preferredTime')}</Text>
                      <Text style={styles.detailText}>{request.preferredTime}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('more.doctorRescheduleRequests.labels.originalFee')}</Text>
                    <Text style={styles.detailText}>
                      ${request.originalAppointmentFee?.toFixed(2) || '0.00'}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => openApproveModal(request)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.textWhite} />
                      <Text style={styles.approveButtonText}>{t('more.doctorRescheduleRequests.actions.approve')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => openRejectModal(request)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.textWhite} />
                      <Text style={styles.rejectButtonText}>{t('more.doctorRescheduleRequests.actions.reject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Approve Modal */}
      <Modal
        visible={showApproveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowApproveModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('more.doctorRescheduleRequests.approveModal.title')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowApproveModal(false);
                  resetForm();
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('more.doctorRescheduleRequests.approveModal.newAppointmentDateLabel')} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('more.doctorRescheduleRequests.approveModal.datePlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={newDate}
                  onChangeText={(text) => {
                    // Only allow YYYY-MM-DD format
                    const cleaned = text.replace(/[^\d-]/g, '');
                    if (cleaned.length <= 10) {
                      setNewDate(cleaned);
                    }
                  }}
                />
                <Text style={styles.inputHint}>{t('more.doctorRescheduleRequests.approveModal.dateHint')}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('more.doctorRescheduleRequests.approveModal.newAppointmentTimeLabel')} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('more.doctorRescheduleRequests.approveModal.timePlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={newTime}
                  onChangeText={(text) => {
                    // Only allow HH:MM format
                    const cleaned = text.replace(/[^\d:]/g, '');
                    if (cleaned.length <= 5) {
                      setNewTime(cleaned);
                    }
                  }}
                />
                <Text style={styles.inputHint}>{t('more.doctorRescheduleRequests.approveModal.timeHint')}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('more.doctorRescheduleRequests.approveModal.feePercentageLabel')}</Text>
                <View style={styles.percentageInput}>
                  <TextInput
                    style={styles.percentageInputField}
                    placeholder={t('more.doctorRescheduleRequests.approveModal.feePercentagePlaceholder')}
                    placeholderTextColor={colors.textLight}
                    value={rescheduleFeePercentage.toString()}
                    onChangeText={(text) => {
                      const val = Math.min(100, Math.max(0, parseInt(text) || 0));
                      setRescheduleFeePercentage(val);
                      setRescheduleFee('');
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                </View>
                <Text style={styles.inputHint}>
                  {t('more.doctorRescheduleRequests.approveModal.feePercentageDefaultHint', {
                    fee: selectedRequest?.originalAppointmentFee?.toFixed(2) || '0.00',
                  })}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('more.doctorRescheduleRequests.approveModal.fixedAmountLabel')}</Text>
                <View style={styles.currencyInput}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.currencyInputField}
                    placeholder={t('more.doctorRescheduleRequests.approveModal.fixedAmountPlaceholder')}
                    placeholderTextColor={colors.textLight}
                    value={rescheduleFee}
                    onChangeText={(text) => {
                      setRescheduleFee(text);
                      if (text && selectedRequest?.originalAppointmentFee) {
                        const percentage = (parseFloat(text) / selectedRequest.originalAppointmentFee) * 100;
                        setRescheduleFeePercentage(Math.min(100, Math.max(0, percentage)));
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.feeInfoCard}>
                <Text style={styles.feeInfoTitle}>{t('more.doctorRescheduleRequests.approveModal.calculatedFee')}</Text>
                <Text style={styles.feeInfoAmount}>${calculateFee().toFixed(2)}</Text>
                <Text style={styles.feeInfoSubtext}>
                  {t('more.doctorRescheduleRequests.approveModal.feeBreakdown', {
                    originalFee: selectedRequest?.originalAppointmentFee?.toFixed(2) || '0.00',
                    rescheduleFee: calculateFee().toFixed(2),
                    savings: ((selectedRequest?.originalAppointmentFee || 0) - calculateFee()).toFixed(2),
                  })}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('more.doctorRescheduleRequests.approveModal.notesLabel')}</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t('more.doctorRescheduleRequests.approveModal.notesPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={doctorNotes}
                  onChangeText={setDoctorNotes}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowApproveModal(false);
                  resetForm();
                }}
                disabled={approveMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (approveMutation.isPending || !newDate || !newTime) && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleApprove}
                disabled={approveMutation.isPending || !newDate || !newTime}
                activeOpacity={0.8}
              >
                {approveMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>{t('more.doctorRescheduleRequests.approveModal.approveCreate')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedRequest(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('more.doctorRescheduleRequests.rejectModal.title')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('more.doctorRescheduleRequests.rejectModal.rejectionReasonLabel')} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t('more.doctorRescheduleRequests.rejectModal.rejectionReasonPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {t('more.doctorRescheduleRequests.rejectModal.characterCount', {
                    current: rejectionReason.length,
                    max: 500,
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                disabled={rejectMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  styles.rejectConfirmButton,
                  (rejectMutation.isPending || rejectionReason.trim().length < 10) &&
                    styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleReject}
                disabled={rejectMutation.isPending || rejectionReason.trim().length < 10}
                activeOpacity={0.8}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>{t('more.doctorRescheduleRequests.rejectModal.rejectRequest')}</Text>
                )}
              </TouchableOpacity>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  requestsList: {
    padding: 16,
    gap: 16,
  },
  requestCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  requestContent: {
    gap: 12,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  percentageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  percentageInputField: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  percentageSymbol: {
    padding: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    padding: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  currencyInputField: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feeInfoCard: {
    backgroundColor: colors.infoLight || colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  feeInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  feeInfoAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  feeInfoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  rejectConfirmButton: {
    backgroundColor: colors.error,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

export default DoctorRescheduleRequestsScreen;
