import React, { useMemo, useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentApi from '../../services/appointment';
import * as reviewApi from '../../services/review';
import * as rescheduleApi from '../../services/rescheduleRequest';
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
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Fetch appointment details
  const { data: appointmentResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.getAppointmentById(appointmentId),
    retry: 1,
  });

  const appointment: appointmentApi.Appointment | null = appointmentResponse?.data || null;

  // Check if review exists for this appointment (patient only)
  const { data: existingReviewData } = useQuery({
    queryKey: ['appointmentReview', appointmentId],
    queryFn: async () => {
      if (!appointment || appointment.status !== 'COMPLETED' || !appointment.doctorId || isDoctor) {
        return null;
      }
      const doctorId = typeof appointment.doctorId === 'string' 
        ? appointment.doctorId 
        : appointment.doctorId._id;
      if (!doctorId) return null;
      try {
        const reviews = await reviewApi.getReviewsByDoctor(doctorId, { page: 1, limit: 100 });
        const reviewsList = reviews.data?.reviews || [];
        return reviewsList.find(
          (r: reviewApi.Review) =>
            r.appointmentId === appointmentId || r.appointmentId === appointment?._id
        );
      } catch (error) {
        console.error('Error fetching reviews:', error);
        return null;
      }
    },
    enabled: !!appointment && appointment.status === 'COMPLETED' && !!appointment.doctorId && !isDoctor,
  });

  const existingReview = existingReviewData;

  // Check if appointment is eligible for reschedule (patient only, CONFIRMED, ONLINE, time passed)
  const [canReschedule, setCanReschedule] = useState(false);
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligibleRescheduleAppointments'],
    queryFn: () => rescheduleApi.getEligibleAppointments(),
    enabled: !!user && !isDoctor && !!appointment && appointment.status === 'CONFIRMED' && appointment.bookingType === 'ONLINE',
    retry: 1,
  });

  // Check if this appointment is eligible for reschedule
  useEffect(() => {
    if (appointment && !isDoctor && appointment.status === 'CONFIRMED' && appointment.bookingType === 'ONLINE') {
      if (eligibleAppointmentsData && eligibleAppointmentsData.length > 0) {
        const isEligible = eligibleAppointmentsData.some((apt: rescheduleApi.EligibleAppointment) => apt._id === appointment._id);
        
        // Also check if appointment time has passed
        if (isEligible && appointment.appointmentDate && appointment.appointmentTime) {
          const now = new Date();
          const appointmentDateTime = new Date(appointment.appointmentDate);
          const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
          appointmentDateTime.setHours(hours, minutes, 0, 0);
          
          if (now > appointmentDateTime) {
            setCanReschedule(true);
          } else {
            setCanReschedule(false);
          }
        } else {
          setCanReschedule(false);
        }
      } else if (appointment.appointmentDate && appointment.appointmentTime) {
        // Basic check if API fails
        const now = new Date();
        const appointmentDateTime = new Date(appointment.appointmentDate);
        const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        
        if (now > appointmentDateTime) {
          setCanReschedule(true);
        } else {
          setCanReschedule(false);
        }
      }
    } else {
      setCanReschedule(false);
    }
  }, [appointment, eligibleAppointmentsData, isDoctor]);

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: (data: reviewApi.CreateReviewData) => reviewApi.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentReview', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      Toast.show({
        type: 'success',
        text1: 'Review Submitted',
        text2: 'Thank you for your feedback!',
      });
      setShowReviewModal(false);
      setReviewText('');
      setReviewRating(5);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit review';
      Toast.show({
        type: 'error',
        text1: 'Review Failed',
        text2: errorMessage,
      });
    },
  });

  // Handle review submission
  const handleReviewSubmit = () => {
    if (!reviewText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Review Required',
        text2: 'Please provide a review text',
      });
      return;
    }
    if (!appointment || !appointment.doctorId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Doctor information not available',
      });
      return;
    }

    const doctorId = typeof appointment.doctorId === 'string' 
      ? appointment.doctorId 
      : appointment.doctorId._id;

    if (!doctorId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Doctor ID not available',
      });
      return;
    }

    createReviewMutation.mutate({
      doctorId,
      appointmentId: appointment._id,
      rating: reviewRating,
      reviewText: reviewText.trim(),
      reviewType: 'APPOINTMENT',
    });
  };

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

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointmentTabCounts'] });
      Toast.show({
        type: 'success',
        text1: 'Appointment Cancelled',
        text2: 'Your appointment has been cancelled successfully',
      });
      refetch();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Cancel',
        text2: error.response?.data?.message || error.message || 'Please try again',
      });
    },
  });

  // Handle appointment cancellation
  const handleCancelAppointment = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelAppointmentMutation.mutate(appointmentId);
          },
        },
      ]
    );
  };

  // Handle chat navigation
  const handleChat = () => {
    if (!appointment) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Appointment information not available',
      });
      return;
    }

    if (isDoctor) {
      // Doctor chatting with patient
      const patientId = typeof appointment.patientId === 'string' 
        ? appointment.patientId 
        : appointment.patientId?._id;
      
      if (!patientId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Patient information not available',
        });
        return;
      }

      if (!appointment._id) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Appointment information not available',
        });
        return;
      }

      (navigation as any).navigate('Chat', {
        screen: 'ChatDetail',
        params: {
          recipientName: appointment.patientId?.fullName || 'Patient',
          patientId: patientId,
          appointmentId: appointment._id,
        },
      });
    } else {
      // Patient chatting with doctor
      const doctorId = typeof appointment.doctorId === 'string' 
        ? appointment.doctorId 
        : appointment.doctorId?._id;
      
      if (!doctorId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Doctor information not available',
        });
        return;
      }

      if (!appointment._id) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Appointment information not available',
        });
        return;
      }

      (navigation as any).navigate('Chat', {
        screen: 'ChatDetail',
        params: {
          recipientName: appointment.doctorId?.fullName || 'Doctor',
          doctorId: doctorId,
          appointmentId: appointment._id,
        },
      });
    }
  };

  // Map backend status to UI status
  const status = useMemo(() => {
    if (!appointment) return 'upcoming' as const;
    const backendStatus = appointment.status;
    if (backendStatus === 'COMPLETED' || backendStatus === 'NO_SHOW') return 'completed' as const;
    if (backendStatus === 'CANCELLED' || backendStatus === 'REJECTED') return 'cancelled' as const;
    return 'upcoming' as const;
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
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  activeOpacity={0.7}
                  onPress={handleChat}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {!isDoctor && status === 'upcoming' && (
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    activeOpacity={0.7}
                    onPress={handleCancelAppointment}
                    disabled={cancelAppointmentMutation.isPending}
                  >
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
          {/* {status === 'upcoming' && isDoctor && appointment?.status === 'PENDING' && (
            <TouchableOpacity 
              style={styles.startSessionBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StartAppointment', { appointmentId: appointmentId })}
            >
              <Text style={styles.startSessionText}>Start Session</Text>
            </TouchableOpacity>
          )} */}
          {status === 'upcoming' && isDoctor && appointment?.status === 'CONFIRMED' && (
            <>
              {appointment?.bookingType === 'ONLINE' && (
                <TouchableOpacity 
                  style={[styles.startSessionBtn, { backgroundColor: colors.primary, marginBottom: 8 }]} 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('VideoCall', { appointmentId: appointmentId })}
                >
                  <Ionicons name="videocam" size={18} color={colors.textWhite} />
                  <Text style={styles.startSessionText}>Start Video Call</Text>
                </TouchableOpacity>
              )}
              {/* <TouchableOpacity 
                style={styles.startSessionBtn} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StartAppointment', { appointmentId: appointmentId })}
              >
                <Text style={styles.startSessionText}>Start Session</Text>
              </TouchableOpacity> */}
            </>
          )}
          {status === 'upcoming' && !isDoctor && appointment?.bookingType === 'ONLINE' && appointment?.status === 'CONFIRMED' && (
            <TouchableOpacity 
              style={[styles.startSessionBtn, { backgroundColor: colors.primary }]} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('VideoCall', { appointmentId: appointmentId })}
            >
              <Ionicons name="videocam" size={18} color={colors.textWhite} />
              <Text style={styles.startSessionText}>Start Video Call</Text>
            </TouchableOpacity>
          )}
          {status === 'upcoming' && !isDoctor && appointment?.bookingType !== 'ONLINE' && (
            <TouchableOpacity style={styles.startSessionBtn} activeOpacity={0.8}>
              <Text style={styles.startSessionText}>View Details</Text>
            </TouchableOpacity>
          )}

          {/* Reschedule button for eligible appointments (patient only) */}
          {!isDoctor && appointment?.status === 'CONFIRMED' && appointment?.bookingType === 'ONLINE' && canReschedule && (
            <View style={styles.rescheduleWarningContainer}>
              <View style={styles.rescheduleWarning}>
                <Ionicons name="warning-outline" size={20} color={colors.warning} />
                <View style={styles.rescheduleWarningContent}>
                  <Text style={styles.rescheduleWarningTitle}>Missed Appointment?</Text>
                  <Text style={styles.rescheduleWarningText}>
                    If you were unable to join the video call, you can request to reschedule.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.rescheduleRequestBtn}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('RequestReschedule', { appointmentId: appointmentId });
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textWhite} />
                <Text style={styles.rescheduleRequestBtnText}>Request Reschedule</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'completed' && (
            <View style={styles.completedActions}>
              <TouchableOpacity
                style={styles.downloadBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Prescription', { appointmentId })}
              >
                <Ionicons name="download-outline" size={18} color={colors.text} />
                <Text style={styles.downloadBtnText}>{isDoctor ? 'Prescription' : 'Download Prescription'}</Text>
              </TouchableOpacity>
              {!isDoctor && !existingReview && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="star-outline" size={18} color={colors.textWhite} />
                  <Text style={styles.reviewBtnText}>Write a Review</Text>
                </TouchableOpacity>
              )}
              {!isDoctor && existingReview && (
                <View style={styles.reviewSubmitted}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.reviewSubmittedText}>Review Submitted</Text>
                </View>
              )}
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

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReviewModal(false);
          setReviewText('');
          setReviewRating(5);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewText('');
                  setReviewRating(5);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                How would you rate your experience with {appointmentData?.name || 'the doctor'}?
              </Text>

              {/* Rating Stars */}
              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                      activeOpacity={0.7}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= reviewRating ? '#FFD700' : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>{reviewRating} / 5</Text>
              </View>

              {/* Review Text */}
              <View style={styles.reviewInputContainer}>
                <Text style={styles.inputLabel}>Your Review</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience..."
                  placeholderTextColor={colors.textLight}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewText('');
                  setReviewRating(5);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!reviewText.trim() || createReviewMutation.isPending) && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleReviewSubmit}
                disabled={!reviewText.trim() || createReviewMutation.isPending}
                activeOpacity={0.8}
              >
                {createReviewMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textWhite} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Review</Text>
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  rescheduleWarningContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  rescheduleWarning: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight || '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  rescheduleWarningContent: {
    flex: 1,
  },
  rescheduleWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  rescheduleWarningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rescheduleRequestBtn: {
    backgroundColor: colors.warning || '#FFC107',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rescheduleRequestBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '600',
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
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 6,
  },
  reviewSubmitted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  reviewSubmittedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginLeft: 6,
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
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reviewInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  reviewInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
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
