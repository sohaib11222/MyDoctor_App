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

type PatientRescheduleRequestsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'PatientRescheduleRequests'>;

const PatientRescheduleRequestsScreen = () => {
  const navigation = useNavigation<PatientRescheduleRequestsScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<rescheduleApi.RescheduleRequest | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch reschedule requests
  const { data: requestsData, isLoading, error: requestsError } = useQuery({
    queryKey: ['rescheduleRequests'],
    queryFn: () => rescheduleApi.listRescheduleRequests(),
    enabled: !!user,
    retry: 1,
  });

  const requests = requestsData || [];

  // Pay reschedule fee mutation
  const payFeeMutation = useMutation({
    mutationFn: ({ requestId, paymentMethod }: { requestId: string; paymentMethod: string }) =>
      rescheduleApi.payRescheduleFee(requestId, paymentMethod),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Payment Successful',
        text2: 'Reschedule fee paid successfully! Your appointment is now confirmed.',
      });
      queryClient.invalidateQueries({ queryKey: ['rescheduleRequests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowPaymentModal(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Payment failed';
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: errorMessage,
      });
    },
  });

  const handlePayFee = (request: rescheduleApi.RescheduleRequest) => {
    setSelectedRequest(request);
    setShowPaymentModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      PENDING: { color: colors.warning, text: 'Pending' },
      APPROVED: { color: colors.success, text: 'Approved' },
      REJECTED: { color: colors.error, text: 'Rejected' },
      CANCELLED: { color: colors.textSecondary, text: 'Cancelled' },
    };
    return badges[status] || { color: colors.textSecondary, text: status };
  };

  const handlePayment = () => {
    if (!selectedRequest) return;
    payFeeMutation.mutate({
      requestId: selectedRequest._id,
      paymentMethod: 'DUMMY',
    });
  };

  const handleViewAppointment = (appointmentId: string | { _id: string }) => {
    const id = typeof appointmentId === 'string' ? appointmentId : appointmentId._id;
    navigation.navigate('AppointmentDetails', { appointmentId: id });
  };

  const handleViewRejectionReason = (reason: string) => {
    Alert.alert('Rejection Reason', reason);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : requestsError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
            <Text style={styles.errorTitle}>Unable to Load Requests</Text>
            <Text style={styles.errorText}>
              {requestsError?.response?.status === 404
                ? 'The reschedule request feature is not available. Please ensure the backend server has been restarted.'
                : requestsError?.response?.data?.message || requestsError?.message || 'An error occurred while loading requests'}
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No reschedule requests found</Text>
            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => navigation.navigate('RequestReschedule', { appointmentId: '' })}
              activeOpacity={0.8}
            >
              <Text style={styles.requestButtonText}>Request Reschedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => {
              const statusBadge = getStatusBadge(request.status);
              return (
                <View key={request._id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestHeaderLeft}>
                      <Text style={styles.requestTitle}>Reschedule Request</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                          {statusBadge.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.requestContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Original Appointment:</Text>
                      <View style={styles.detailValue}>
                        {request.appointmentId ? (
                          <>
                            <Text style={styles.detailText}>
                              {new Date(request.appointmentId.appointmentDate).toLocaleDateString()}
                            </Text>
                            <Text style={styles.detailSubtext}>{request.appointmentId.appointmentTime}</Text>
                            {request.appointmentId.appointmentNumber && (
                              <Text style={styles.detailSubtext}>
                                #{request.appointmentId.appointmentNumber}
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text style={styles.detailText}>N/A</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={styles.detailText} numberOfLines={2}>
                        {request.reason}
                      </Text>
                    </View>

                    {request.status === 'APPROVED' && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reschedule Fee:</Text>
                        <Text style={[styles.detailText, styles.feeText]}>
                          ${request.rescheduleFee?.toFixed(2) || '—'}
                        </Text>
                      </View>
                    )}

                    {request.newAppointmentId && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>New Appointment:</Text>
                        <TouchableOpacity
                          onPress={() => handleViewAppointment(request.newAppointmentId!)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.viewAppointmentButton}>
                            <Text style={styles.viewAppointmentText}>View Appointment</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      {request.status === 'APPROVED' &&
                        request.newAppointmentId &&
                        request.newAppointmentId.paymentStatus !== 'PAID' && (
                          <TouchableOpacity
                            style={styles.payButton}
                            onPress={() => handlePayFee(request)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="card-outline" size={18} color={colors.textWhite} />
                            <Text style={styles.payButtonText}>Pay Fee</Text>
                          </TouchableOpacity>
                        )}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <TouchableOpacity
                          style={styles.reasonButton}
                          onPress={() => handleViewRejectionReason(request.rejectionReason!)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="information-circle-outline" size={18} color={colors.text} />
                          <Text style={styles.reasonButtonText}>View Reason</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setSelectedRequest(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Reschedule Fee</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedRequest(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>Reschedule Fee:</Text>
                <Text style={styles.paymentAmount}>
                  ${selectedRequest?.rescheduleFee?.toFixed(2) || '0.00'}
                </Text>
              </View>
              {selectedRequest?.originalAppointmentFee && (
                <Text style={styles.paymentSubtext}>
                  Original appointment fee: ${selectedRequest.originalAppointmentFee.toFixed(2)}
                </Text>
              )}
              {selectedRequest?.newAppointmentId && (
                <Text style={styles.paymentSubtext}>
                  New appointment date:{' '}
                  {new Date(selectedRequest.newAppointmentId.appointmentDate).toLocaleDateString()}
                </Text>
              )}
              <View style={styles.paymentInfoCard}>
                <Ionicons name="information-circle-outline" size={20} color={colors.info} />
                <Text style={styles.paymentInfoText}>
                  Click "Confirm Payment" to proceed with the payment.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedRequest(null);
                }}
                disabled={payFeeMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  payFeeMutation.isPending && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handlePayment}
                disabled={payFeeMutation.isPending}
                activeOpacity={0.8}
              >
                {payFeeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm Payment</Text>
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
    marginBottom: 16,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    paddingHorizontal: 24,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textWhite,
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
  requestHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
  detailValue: {
    gap: 2,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  viewAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAppointmentText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
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
    gap: 12,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight || colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  paymentInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
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

export default PatientRescheduleRequestsScreen;
