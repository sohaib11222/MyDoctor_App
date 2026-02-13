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
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentApi from '../../services/appointment';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'last7Days'>('last7Days');
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
        text1: t('appointments.requests.accept.toastTitle'),
        text2: t('appointments.requests.accept.toastBody'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('appointments.requests.accept.failedFallback');
      Toast.show({
        type: 'error',
        text1: t('appointments.requests.accept.failedToastTitle'),
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
        text1: t('appointments.requests.reject.toastTitle'),
        text2: t('appointments.requests.reject.toastBody'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('appointments.requests.reject.failedFallback');
      Toast.show({
        type: 'error',
        text1: t('appointments.requests.reject.failedToastTitle'),
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
      const appointmentType = apt.bookingType;
      
      return {
        appointmentId: apt._id,
        id: apt.appointmentNumber || apt._id,
        patientName: apt.patientId?.fullName || t('common.unknownPatient'),
        patientImageUri: apt.patientId?.profileImage,
        date: dateTimeString,
        visitType: apt.patientNotes || t('appointments.details.generalVisit'),
        appointmentType,
        clinicLocation: apt.clinicName,
        isNew,
      } as UIAppointmentRequest;
    });
  }, [appointmentsData, t]);

  const handleAccept = (appointmentId: string) => {
    Alert.alert(t('appointments.requests.accept.alertTitle'), t('appointments.requests.accept.alertBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appointments.requests.accept.alertConfirm'),
        onPress: () => {
          acceptMutation.mutate(appointmentId);
        },
      },
    ]);
  };

  const handleReject = (appointmentId: string) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('appointments.requests.reject.alertTitle'),
        t('appointments.requests.reject.alertBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('appointments.requests.reject.alertConfirm'),
            style: 'destructive',
            onPress: (reason?: string) => {
              rejectMutation.mutate({ appointmentId, reason: reason || undefined });
            },
          },
        ],
        'plain-text'
      );
      return;
    }

    Alert.alert(t('appointments.requests.reject.alertTitle'), t('appointments.requests.reject.alertBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appointments.requests.reject.alertConfirm'),
        style: 'destructive',
        onPress: () => {
          rejectMutation.mutate({ appointmentId });
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getAppointmentTypeIcon = (type: string) => {
    switch (type) {
      case 'ONLINE':
        return { name: 'calendar-outline', color: colors.info };
      case 'VISIT':
        return { name: 'medical-outline', color: colors.success };
      default:
        return { name: 'chatbubble-outline', color: colors.textSecondary };
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    if (type === 'VISIT') return t('appointments.bookingType.directVisit');
    if (type === 'ONLINE') return t('appointments.bookingType.online');
    return type;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Period Selector */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appointments.requests.title')}</Text>
        <TouchableOpacity style={styles.periodSelector}>
          <Text style={styles.periodText}>
            {selectedPeriod === 'last7Days'
              ? t('appointments.requests.periodLast7Days')
              : selectedPeriod}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('appointments.requests.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>{t('appointments.requests.failedToLoad')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : uiRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>{t('appointments.requests.empty')}</Text>
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
                            <Text style={styles.newBadgeText}>{t('appointments.badgeNew')}</Text>
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
                  <Text style={styles.typeLabel}>{t('appointments.details.typeOfAppointment')}</Text>
                  <View style={styles.typeContainer}>
                    <Ionicons name={icon.name as any} size={16} color={icon.color} />
                    <Text style={styles.typeText}>{getAppointmentTypeLabel(request.appointmentType)}</Text>
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
                        <Text style={styles.acceptButtonText}>{t('appointments.requests.accept.alertConfirm')}</Text>
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
                        <Text style={styles.rejectButtonText}>{t('appointments.requests.reject.alertConfirm')}</Text>
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

