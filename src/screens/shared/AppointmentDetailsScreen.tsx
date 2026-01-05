import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentApi from '../../services/appointment';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';

/**
 * Normalize image URL for mobile app
 * Replaces localhost with device-accessible IP address
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  // Get device-accessible host from API_BASE_URL
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    // Fallback: extract host from string
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.0.114'; // Default fallback
  }
  
  // If it's already a full URL
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    // Replace localhost/127.0.0.1 with device host
    let normalizedUrl = trimmedUri;
    
    // Replace localhost with device host (simpler string replacement)
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    
    // Replace 127.0.0.1 with device host
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    
    if (__DEV__) {
      console.log('🖼️ Normalized URL:', normalizedUrl, '(from:', trimmedUri, ')');
      console.log('🖼️ Device Host:', deviceHost);
    }
    
    return normalizedUrl;
  }
  
  // It's a relative path, construct full URL
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  const fullUrl = `${baseUrl}${imagePath}`;
  
  if (__DEV__) {
    console.log('🖼️ Constructed full URL:', fullUrl, '(from relative:', trimmedUri, ')');
  }
  
  return fullUrl;
};

type AppointmentDetailsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentDetails'>;
type AppointmentDetailsRouteProp = RouteProp<AppointmentsStackParamList, 'AppointmentDetails'>;

const AppointmentDetailsScreen = () => {
  const navigation = useNavigation<AppointmentDetailsScreenNavigationProp>();
  const route = useRoute<AppointmentDetailsRouteProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const { appointmentId } = route.params;

  const queryClient = useQueryClient();

  // Fetch appointment details
  const { data: appointmentResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.getAppointmentById(appointmentId),
    retry: 1,
  });

  const appointment = appointmentResponse?.data || appointmentResponse;

  // Update status mutation (for marking as completed/no-show)
  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: 'COMPLETED' | 'NO_SHOW' }) =>
      appointmentApi.updateAppointmentStatus(appointmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointmentTabCounts'] });
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: 'Appointment status updated successfully!',
      });
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update appointment status';
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errorMessage,
      });
    },
  });

  // Handle status update
  const handleStatusUpdate = (newStatus: 'COMPLETED' | 'NO_SHOW') => {
    const statusText = newStatus === 'COMPLETED' ? 'completed' : 'marked as no-show';
    Alert.alert(
      'Update Status',
      `Are you sure you want to mark this appointment as ${statusText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateStatusMutation.mutate({ status: newStatus });
          },
        },
      ]
    );
  };

  // Map backend status to UI status
  const status = useMemo(() => {
    if (!appointment) return 'upcoming';
    const backendStatus = appointment.status;
    if (backendStatus === 'COMPLETED' || backendStatus === 'NO_SHOW') return 'completed';
    if (backendStatus === 'CANCELLED' || backendStatus === 'REJECTED') return 'cancelled';
    return 'upcoming';
  }, [appointment]);

  // Format appointment data for display
  const appointmentData = useMemo(() => {
    if (!appointment) return null;

    const appointmentDate = new Date(appointment.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = appointment.appointmentTime;
    const dateTimeString = `${formattedDate} - ${formattedTime}`;

    if (isDoctor) {
      return {
        id: appointment.appointmentNumber || appointment._id,
        name: appointment.patientId?.fullName || 'Unknown Patient',
        imageUri: appointment.patientId?.profileImage,
        email: appointment.patientId?.email || '',
        phone: appointment.patientId?.phone || '',
        date: dateTimeString,
        clinic: appointment.clinicName || 'Not specified',
        location: appointment.clinicName || 'Not specified',
        visitType: appointment.patientNotes || 'General Visit',
        appointmentType: appointment.bookingType === 'VISIT' ? 'Direct Visit' : 'Online',
        fee: 0, // Fee not in appointment model
        personWithPatient: undefined,
      };
    } else {
      return {
        id: appointment.appointmentNumber || appointment._id,
        name: appointment.doctorId?.fullName || 'Unknown Doctor',
        imageUri: appointment.doctorId?.profileImage,
        email: appointment.doctorId?.email || '',
        phone: appointment.doctorId?.phone || '',
        date: dateTimeString,
        clinic: appointment.clinicName || 'Not specified',
        location: appointment.clinicName || 'Not specified',
        visitType: appointment.patientNotes || 'General Visit',
        appointmentType: appointment.bookingType === 'VISIT' ? 'Direct Visit' : 'Online',
        fee: 0, // Fee not in appointment model
        personWithPatient: undefined,
      };
    }
  }, [appointment, isDoctor]);

  const recentAppointments = [
    { id: '#Apt0002', doctor: isDoctor ? 'Kelly Stevens' : 'Dr.Shanta Nesmith', doctorImg: require('../../../assets/avatar.png'), date: '11 Nov 2024 10.45 AM', types: ['General Visit', 'Chat'], email: 'shanta@example.com', phone: '+1 504 368 6874' },
    { id: '#Apt0003', doctor: isDoctor ? 'Samuel Anderson' : 'Dr.John Ewel', doctorImg: require('../../../assets/avatar.png'), date: '27 Oct 2024 09.30 AM', types: ['General Visit', 'Online'], email: 'john@example.com', phone: '+1 749 104 6291' },
  ];

  const getStatusBadge = () => {
    if (!appointment) {
      return { bg: colors.backgroundLight, text: colors.text, label: 'Unknown' };
    }
    
    const backendStatus = appointment.status;
    switch (backendStatus) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
      case 'CONFIRMED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmed' };
      case 'COMPLETED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
      case 'NO_SHOW':
        return { bg: '#F3F4F6', text: '#374151', label: 'No Show' };
      default:
        return { bg: colors.backgroundLight, text: colors.text, label: backendStatus || 'Unknown' };
    }
  };

  const statusBadge = getStatusBadge();
  const defaultAvatar = require('../../../assets/avatar.png');

  // Normalize image URL for mobile
  const normalizedImageUrl = normalizeImageUrl(appointmentData?.imageUri);
  const imageSource = normalizedImageUrl 
    ? { uri: normalizedImageUrl }
    : defaultAvatar;
  
  // Debug logging
  if (__DEV__) {
    if (appointmentData?.imageUri) {
      console.log('🖼️ Appointment Details - Original imageUri:', appointmentData.imageUri);
      console.log('🖼️ Appointment Details - Normalized URL:', normalizedImageUrl);
    } else {
      console.log('🖼️ Appointment Details - No imageUri in appointmentData');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !appointmentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Failed to load appointment details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appointment Detail Card */}
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.doctorInfo}>
              <Image 
                source={imageSource} 
                style={styles.doctorImage}
                onError={(error) => {
                  if (__DEV__) {
                    console.log('🖼️ Appointment Details - Image load error:', error.nativeEvent.error);
                    console.log('🖼️ Appointment Details - Failed image source:', imageSource);
                  }
                }}
                onLoad={() => {
                  if (__DEV__) {
                    console.log('🖼️ Appointment Details - Image loaded successfully');
                  }
                }}
                resizeMode="cover"
              />
              <View style={styles.doctorDetails}>
                <Text style={styles.appointmentId}>{appointmentData.id}</Text>
                <Text style={styles.doctorName}>{appointmentData.name}</Text>
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.contactText}>{appointmentData.email}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.contactText}>{appointmentData.phone}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.appointmentActions}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>
              <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Payment Status</Text>
                <Text style={styles.feeAmount}>
                  {appointment?.paymentStatus === 'PAID' ? 'Paid' : 
                   appointment?.paymentStatus === 'UNPAID' ? 'Unpaid' : 
                   appointment?.paymentStatus === 'REFUNDED' ? 'Refunded' : 'N/A'}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {status === 'upcoming' && (
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.appointmentTypeSection}>
            <Text style={styles.sectionLabel}>Type of Appointment</Text>
            <View style={styles.typeBadge}>
              <Ionicons 
                name={appointmentData.appointmentType === 'Direct Visit' ? 'medical-outline' : 'calendar-outline'} 
                size={16} 
                color={colors.success} 
              />
              <Text style={styles.typeText}>{appointmentData.appointmentType}</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Appointment Date & Time</Text>
              <Text style={styles.detailValue}>{appointmentData.date}</Text>
            </View>
            {appointmentData.clinic && appointmentData.clinic !== 'Not specified' && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Clinic Location</Text>
                <Text style={styles.detailValue}>{appointmentData.clinic}</Text>
              </View>
            )}
            {appointmentData.visitType && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Visit Type / Notes</Text>
                <Text style={styles.detailValue}>{appointmentData.visitType}</Text>
              </View>
            )}
            {appointment?.appointmentNumber && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Appointment Number</Text>
                <Text style={styles.detailValue}>{appointment.appointmentNumber}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons based on status and role */}
          {appointment?.status === 'CONFIRMED' && isDoctor && (
            <View style={styles.statusActionButtons}>
              <TouchableOpacity
                style={[styles.statusActionBtn, styles.completedBtn]}
                onPress={() => handleStatusUpdate('COMPLETED')}
                disabled={updateStatusMutation.isPending}
                activeOpacity={0.8}
              >
                {updateStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={colors.textWhite} />
                    <Text style={styles.statusActionBtnText}>Mark as Completed</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusActionBtn, styles.noShowBtn]}
                onPress={() => handleStatusUpdate('NO_SHOW')}
                disabled={updateStatusMutation.isPending}
                activeOpacity={0.8}
              >
                {updateStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color={colors.textWhite} />
                    <Text style={styles.statusActionBtnText}>Mark as No Show</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          {status === 'upcoming' && isDoctor && appointment?.status === 'PENDING' && (
            <TouchableOpacity 
              style={styles.startSessionBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StartAppointment', { appointmentId: appointmentId })}
            >
              <Text style={styles.startSessionText}>Start Session</Text>
            </TouchableOpacity>
          )}
          {status === 'upcoming' && isDoctor && appointment?.status === 'CONFIRMED' && (
            <TouchableOpacity 
              style={styles.startSessionBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StartAppointment', { appointmentId: appointmentId })}
            >
              <Text style={styles.startSessionText}>Start Session</Text>
            </TouchableOpacity>
          )}
          {status === 'upcoming' && !isDoctor && appointment?.bookingType !== 'ONLINE' && (
            <TouchableOpacity style={styles.startSessionBtn} activeOpacity={0.8}>
              <Text style={styles.startSessionText}>View Details</Text>
            </TouchableOpacity>
          )}

          {status === 'completed' && (
            <View style={styles.completedActions}>
              <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={18} color={colors.text} />
                <Text style={styles.downloadBtnText}>Download Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.8}>
                <Text style={styles.rescheduleBtnText}>Reschedule Appointment</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'cancelled' && (
            <View style={styles.cancelledActions}>
              <TouchableOpacity style={styles.reasonBtn} activeOpacity={0.7}>
                <Text style={styles.reasonBtnText}>Reason</Text>
              </TouchableOpacity>
              <View style={styles.rescheduleContainer}>
                <View style={styles.rescheduleBadge}>
                  <Text style={styles.rescheduleBadgeText}>Status : Reschedule</Text>
                </View>
                <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.8}>
                  <Text style={styles.rescheduleBtnText}>Reschedule Appointment</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Recent Appointments - Can be added later if needed */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  appointmentCard: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  doctorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    marginTop: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  appointmentActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feeContainer: {
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentTypeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  personSection: {
    marginBottom: 16,
  },
  personBadge: {
    backgroundColor: colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  personText: {
    fontSize: 14,
    color: colors.text,
  },
  detailsSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  startSessionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  startSessionText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  completedActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  rescheduleBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rescheduleBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelledActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonBtn: {
    marginBottom: 12,
  },
  reasonBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  rescheduleContainer: {
    gap: 8,
  },
  rescheduleBadge: {
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rescheduleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  recentCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recentDoctor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  recentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentDateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  recentTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentTypeBadge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recentTypeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recentViewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  statusActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statusActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  completedBtn: {
    backgroundColor: colors.success,
  },
  noShowBtn: {
    backgroundColor: '#F59E0B', // Amber/orange color
  },
  statusActionBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AppointmentDetailsScreen;
