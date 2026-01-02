import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentApi from '../../services/appointment';
import Toast from 'react-native-toast-message';

type AppointmentRequestsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentRequests'>;

interface UIAppointmentRequest {
  appointmentId: string; // Backend _id
  id: string; // Appointment number
  patientName: string;
  patientImageUri?: string;
  date: string;
  visitType: string;
  appointmentType: string;
  clinicLocation?: string;
  isNew?: boolean;
}

export const AppointmentRequestsScreen = () => {
  const navigation = useNavigation<AppointmentRequestsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 7 Days');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pending appointments (requests)
  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['appointmentRequests'],
    queryFn: async () => {
      const response = await appointmentApi.listAppointments({
        status: 'PENDING',
        page: 1,
        limit: 100,
      });
      return response.data?.appointments || [];
    },
    retry: 1,
  });

  // Accept appointment mutation
  const acceptMutation = useMutation({
    mutationFn: (appointmentId: string) => appointmentApi.acceptAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Toast.show({
        type: 'success',
        text1: 'Appointment Accepted',
        text2: 'The appointment has been accepted successfully',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to accept appointment';
      Toast.show({
        type: 'error',
        text1: 'Accept Failed',
        text2: errorMessage,
      });
    },
  });

  // Reject appointment mutation
  const rejectMutation = useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      appointmentApi.rejectAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Toast.show({
        type: 'success',
        text1: 'Appointment Rejected',
        text2: 'The appointment has been rejected',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reject appointment';
      Toast.show({
        type: 'error',
        text1: 'Reject Failed',
        text2: errorMessage,
      });
    },
  });

  // Convert backend appointments to UI format
  const uiRequests = useMemo(() => {
    if (!appointmentsData) return [];
    
    return appointmentsData.map(apt => {
      const appointmentDate = new Date(apt.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = apt.appointmentTime;
      const dateTimeString = `${formattedDate} ${formattedTime}`;
      
      // Determine if appointment is new (created recently)
      const isNew = new Date(apt.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Within last 24 hours
      
      // Get appointment type display
      let appointmentType = 'Video Call';
      if (apt.bookingType === 'VISIT') {
        appointmentType = 'Direct Visit';
      }
      
      return {
        appointmentId: apt._id,
        id: apt.appointmentNumber || apt._id,
        patientName: apt.patientId?.fullName || 'Unknown Patient',
        patientImageUri: apt.patientId?.profileImage,
        date: dateTimeString,
        visitType: apt.patientNotes || 'General Visit',
        appointmentType,
        clinicLocation: apt.clinicName,
        isNew,
      } as UIAppointmentRequest;
    });
  }, [appointmentsData]);

  const handleAccept = (appointmentId: string) => {
    Alert.alert('Accept Appointment', 'Are you sure you want to accept this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () => {
          acceptMutation.mutate(appointmentId);
        },
      },
    ]);
  };

  const handleReject = (appointmentId: string) => {
    Alert.prompt(
      'Reject Appointment',
      'Are you sure you want to reject this appointment? (Optional: Enter a reason)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason) => {
            rejectMutation.mutate({ appointmentId, reason: reason || undefined });
          },
        },
      ],
      'plain-text'
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getAppointmentTypeIcon = (type: string) => {
    switch (type) {
      case 'Video Call':
        return { name: 'videocam-outline', color: colors.info };
      case 'Audio Call':
        return { name: 'call-outline', color: colors.primary };
      case 'Direct Visit':
        return { name: 'medical-outline', color: colors.success };
      default:
        return { name: 'chatbubble-outline', color: colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Period Selector */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
        <TouchableOpacity style={styles.periodSelector}>
          <Text style={styles.periodText}>{selectedPeriod}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Failed to load requests</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : uiRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {uiRequests.map((request) => {
            const icon = getAppointmentTypeIcon(request.appointmentType);
            const defaultAvatar = require('../../../assets/avatar.png');
            const imageSource = request.patientImageUri
              ? { uri: request.patientImageUri }
              : defaultAvatar;
            
            return (
              <View key={request.appointmentId} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.patientInfo}>
                    <TouchableOpacity
                      onPress={() => (navigation as any).navigate('Home', {
                        screen: 'PatientProfile',
                        params: { patientId: request.appointmentId },
                      })}
                    >
                      <Image source={imageSource} style={styles.patientImage} />
                    </TouchableOpacity>
                    <View style={styles.patientDetails}>
                      <View style={styles.patientNameRow}>
                        <Text style={styles.patientId}>{request.id}</Text>
                        {request.isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>New</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => (navigation as any).navigate('Home', {
                          screen: 'PatientProfile',
                          params: { patientId: request.appointmentId },
                        })}
                      >
                        <Text style={styles.patientName}>{request.patientName}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.requestInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{request.date}</Text>
                  </View>
                  <Text style={styles.visitType}>{request.visitType}</Text>
                </View>

                <View style={styles.appointmentTypeSection}>
                  <Text style={styles.typeLabel}>Type of Appointment</Text>
                  <View style={styles.typeContainer}>
                    <Ionicons name={icon.name as any} size={16} color={icon.color} />
                    <Text style={styles.typeText}>{request.appointmentType}</Text>
                    {request.clinicLocation && (
                      <>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                        <Text style={styles.clinicText}>{request.clinicLocation}</Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.acceptButton, acceptMutation.isPending && styles.buttonDisabled]}
                    onPress={() => handleAccept(request.appointmentId)}
                    activeOpacity={0.8}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={colors.textWhite} />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, rejectMutation.isPending && styles.buttonDisabled]}
                    onPress={() => handleReject(request.appointmentId)}
                    activeOpacity={0.8}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="close" size={18} color={colors.error} />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    gap: 4,
  },
  periodText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textWhite,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  requestInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  visitType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  appointmentTypeSection: {
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  clinicText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 6,
  },
  rejectButtonText: {
    color: colors.error,
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
  buttonDisabled: {
    opacity: 0.6,
  },
});

