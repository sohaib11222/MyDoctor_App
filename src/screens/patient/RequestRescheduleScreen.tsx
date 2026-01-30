import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as rescheduleApi from '../../services/rescheduleRequest';
import Toast from 'react-native-toast-message';

type RequestRescheduleScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'RequestReschedule'>;
type RequestRescheduleRouteProp = RouteProp<AppointmentsStackParamList, 'RequestReschedule'>;

const RequestRescheduleScreen = () => {
  const navigation = useNavigation<RequestRescheduleScreenNavigationProp>();
  const route = useRoute<RequestRescheduleRouteProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { appointmentId } = route.params;

  const [selectedAppointment, setSelectedAppointment] = useState<rescheduleApi.EligibleAppointment | null>(null);
  const [reason, setReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Fetch eligible appointments
  const { data: eligibleAppointmentsData, isLoading, error: eligibleError } = useQuery({
    queryKey: ['eligibleRescheduleAppointments'],
    queryFn: () => rescheduleApi.getEligibleAppointments(),
    enabled: !!user,
    retry: 1,
  });

  const eligibleAppointments = eligibleAppointmentsData || [];

  // Auto-select appointment if appointmentId is provided
  useEffect(() => {
    if (appointmentId && eligibleAppointments.length > 0) {
      const apt = eligibleAppointments.find((a) => a._id === appointmentId);
      if (apt) {
        setSelectedAppointment(apt);
      }
    }
  }, [appointmentId, eligibleAppointments]);

  // Create reschedule request mutation
  const createRequestMutation = useMutation({
    mutationFn: (data: rescheduleApi.CreateRescheduleRequestData) =>
      rescheduleApi.createRescheduleRequest(data),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Request Submitted',
        text2: 'Reschedule request submitted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['eligibleRescheduleAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['rescheduleRequests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigation.navigate('PatientRescheduleRequests');
    },
    onError: (error: any) => {
      console.error('Create reschedule request error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Request data sent:', error?.config?.data);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit reschedule request';
      const validationErrors = error?.response?.data?.errors;
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: validationErrors ? JSON.stringify(validationErrors) : errorMessage,
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedAppointment) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select an appointment',
      });
      return;
    }
    if (reason.trim().length < 10) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Reason must be at least 10 characters',
      });
      return;
    }

    const payload: rescheduleApi.CreateRescheduleRequestData = {
      appointmentId: selectedAppointment._id,
      reason: reason.trim(),
    };

    // Only add preferredDate if it's a valid date string (YYYY-MM-DD)
    if (preferredDate && preferredDate.trim()) {
      const dateStr = preferredDate.trim();
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateStr)) {
        // Validate it's a valid date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          payload.preferredDate = dateStr;
        } else {
          Toast.show({
            type: 'error',
            text1: 'Invalid Date',
            text2: 'Please enter a valid date in YYYY-MM-DD format',
          });
          return;
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Invalid Date Format',
          text2: 'Please enter date in YYYY-MM-DD format (e.g., 2026-01-30)',
        });
        return;
      }
    }

    // Only add preferredTime if it's a valid time string (HH:MM)
    if (preferredTime && preferredTime.trim()) {
      const timeStr = preferredTime.trim();
      // Validate time format (HH:MM) - matches backend validator regex
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timeRegex.test(timeStr)) {
        // Normalize time to always have 2-digit hours (e.g., "9:30" -> "09:30")
        const [hours, minutes] = timeStr.split(':');
        payload.preferredTime = `${hours.padStart(2, '0')}:${minutes}`;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Invalid Time Format',
          text2: 'Please enter time in HH:MM format (e.g., 14:30)',
        });
        return;
      }
    }

    // Log the payload for debugging
    if (__DEV__) {
      console.log('🔍 Creating reschedule request with data:', JSON.stringify(payload, null, 2));
    }

    createRequestMutation.mutate(payload);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Eligible Appointments List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Missed Appointment</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
          ) : eligibleError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
              <Text style={styles.errorTitle}>Unable to Load Appointments</Text>
              <Text style={styles.errorText}>
                {eligibleError?.response?.status === 404
                  ? 'The reschedule request feature is not available. Please ensure the backend server has been restarted.'
                  : eligibleError?.response?.data?.message || eligibleError?.message || 'An error occurred'}
              </Text>
            </View>
          ) : eligibleAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No appointments eligible for reschedule</Text>
              <Text style={styles.emptySubtext}>
                Only confirmed appointments that have passed without you joining the video call can be rescheduled.
              </Text>
            </View>
          ) : (
            <View style={styles.appointmentsList}>
              {eligibleAppointments.map((apt) => (
                <TouchableOpacity
                  key={apt._id}
                  style={[
                    styles.appointmentCard,
                    selectedAppointment?._id === apt._id && styles.appointmentCardSelected,
                  ]}
                  onPress={() => setSelectedAppointment(apt)}
                  activeOpacity={0.7}
                >
                  <View style={styles.appointmentCardContent}>
                    <View style={styles.appointmentCardHeader}>
                      <Text style={styles.appointmentDoctorName}>
                        Dr. {apt.doctorId?.fullName || 'Unknown Doctor'}
                      </Text>
                      <View style={styles.missedBadge}>
                        <Text style={styles.missedBadgeText}>Missed</Text>
                      </View>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.appointmentDate}>
                        {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.appointmentTime}
                      </Text>
                    </View>
                    {apt.appointmentNumber && (
                      <Text style={styles.appointmentNumber}>Appointment #: {apt.appointmentNumber}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reschedule Form */}
        {selectedAppointment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reschedule Request Form</Text>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Reason for Missing Appointment <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Please provide a detailed reason for missing the appointment (minimum 10 characters)"
                  placeholderTextColor={colors.textLight}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {reason.length}/500 characters (minimum 10 required)
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Preferred New Date (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textLight}
                    value={preferredDate}
                    onChangeText={(text) => {
                      // Only allow YYYY-MM-DD format
                      const cleaned = text.replace(/[^\d-]/g, '');
                      if (cleaned.length <= 10) {
                        setPreferredDate(cleaned);
                      }
                    }}
                  />
                  <Text style={styles.inputHint}>Format: YYYY-MM-DD (e.g., 2026-01-30). This is just a suggestion.</Text>
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Preferred New Time (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textLight}
                    value={preferredTime}
                    onChangeText={(text) => {
                      // Only allow HH:MM format
                      const cleaned = text.replace(/[^\d:]/g, '');
                      if (cleaned.length <= 5) {
                        setPreferredTime(cleaned);
                      }
                    }}
                  />
                  <Text style={styles.inputHint}>Format: HH:MM (e.g., 14:30)</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={colors.info} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Note</Text>
                  <Text style={styles.infoText}>
                    Your request will be reviewed by the doctor. If approved, you will need to pay a reschedule fee
                    (typically 50% of the original fee) to confirm the new appointment.
                  </Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (createRequestMutation.isPending || reason.trim().length < 10) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={createRequestMutation.isPending || reason.trim().length < 10}
                  activeOpacity={0.8}
                >
                  {createRequestMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.textWhite} />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  section: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  appointmentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  appointmentCardContent: {
    gap: 8,
  },
  appointmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  missedBadge: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  missedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  appointmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  appointmentNumber: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  form: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    gap: 8,
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
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight || colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

export default RequestRescheduleScreen;
