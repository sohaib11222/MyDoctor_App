import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { MoreStackParamList, TabParamList, HomeStackParamList, AppointmentsStackParamList, ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as patientApi from '../../services/patient';
import * as favoriteApi from '../../services/favorite';
import * as medicalRecordsApi from '../../services/medicalRecords';
import * as paymentApi from '../../services/payment';
import { API_BASE_URL } from '../../config/api';

type PatientDashboardScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

const { width } = Dimensions.get('window');

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

/**
 * Format date
 */
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

/**
 * Format date and time
 */
const formatDateTime = (dateString: string | undefined | null, timeString?: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  return timeString ? `${dateStr}, ${timeString}` : dateStr;
};

const healthRecords = [
  { icon: 'heart', label: 'Heart Rate', value: '140 Bpm', change: '2%', color: colors.warning },
  { icon: 'thermometer', label: 'Body Temperature', value: '37.5 C', color: colors.warning },
  { icon: 'document-text', label: 'Glucose Level', value: '70 - 90', change: '6%', color: colors.info },
  { icon: 'pulse', label: 'SPo2', value: '96%', color: colors.primary },
  { icon: 'water', label: 'Blood Pressure', value: '100 mg/dl', change: '2%', color: colors.error },
  { icon: 'body', label: 'BMI', value: '20.1 kg/m2', color: colors.secondary },
];

export const PatientDashboardScreen = () => {
  const navigation = useNavigation<PatientDashboardScreenNavigationProp>();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch dashboard data
  const { data: dashboardResponse, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['patientDashboard'],
    queryFn: () => patientApi.getPatientDashboard(),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch favorites
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites', userId, 'dashboard'],
    queryFn: () => favoriteApi.listFavorites(String(userId), { page: 1, limit: 4 }),
    enabled: !!userId,
  });

  // Extract dashboard data
  const dashboard = useMemo(() => {
    if (!dashboardResponse) return null;
    const responseData = dashboardResponse.data || dashboardResponse;
    return responseData;
  }, [dashboardResponse]);

  // Extract favorites
  const favorites = useMemo(() => {
    if (!favoritesData) return [];
    const responseData = favoritesData.data || favoritesData;
    return Array.isArray(responseData) ? responseData : (responseData.favorites || []);
  }, [favoritesData]);

  // Get upcoming appointments
  const upcomingAppointments = useMemo(() => {
    return dashboard?.upcomingAppointments?.appointments || [];
  }, [dashboard]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard()]);
    setRefreshing(false);
  }, [refetchDashboard]);

  const handleBookAppointment = () => {
    (navigation as any).navigate('Home', { screen: 'Search' });
  };

  const handleViewFavourites = () => {
    (navigation as any).navigate('More', { screen: 'Favourites' });
  };

  const handleViewAppointment = (appointmentId: string) => {
    (navigation as any).navigate('Appointments', { screen: 'AppointmentDetails', params: { appointmentId } });
  };

  const handleChat = (doctorId: string, appointmentId: string) => {
    (navigation as any).navigate('Chat', { screen: 'ChatDetail', params: { chatId: doctorId, appointmentId, recipientName: 'Doctor' } });
  };

  if (dashboardLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Book Appointment Header */}
        <View style={styles.bookAppointmentHeader}>
          <View>
            <Text style={styles.bookAppointmentTitle}>Book a new</Text>
            <Text style={styles.bookAppointmentSubtitle}>Appointment</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleBookAppointment}>
            <Ionicons name="add" size={24} color={colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Health Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Records</Text>
          <View style={styles.healthRecordsGrid}>
            {healthRecords.map((record, index) => (
              <View key={index} style={styles.healthRecordCard}>
                <View style={[styles.healthRecordIcon, { backgroundColor: record.color + '20' }]}>
                  <Ionicons name={record.icon as any} size={20} color={record.color} />
                </View>
                <Text style={styles.healthRecordLabel}>{record.label}</Text>
                <View style={styles.healthRecordValueRow}>
                  <Text style={styles.healthRecordValue}>{record.value}</Text>
                  {record.change && (
                    <Text style={styles.healthRecordChange}> {record.change}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.reportDate}>
            <Text style={styles.reportDateText}>
              Report generated on last visit : 25 Mar 2024
            </Text>
            <TouchableOpacity>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Favourites */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favourites</Text>
            <TouchableOpacity onPress={handleViewFavourites}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {favorites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No favorite doctors yet</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => (navigation as any).navigate('Home', { screen: 'Search' })}
              >
                <Text style={styles.emptyStateButtonText}>Find Doctors</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favorites.slice(0, 4).map((favorite) => {
                const doctor = favorite.doctorId;
                const doctorName = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor.fullName : 'Unknown Doctor';
                const doctorImage = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor.profileImage : null;
                const normalizedImageUrl = normalizeImageUrl(doctorImage);
                const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
                const specialization = (doctor && typeof doctor === 'object' && doctor !== null) && doctor.doctorProfile?.specialization 
                  ? (typeof doctor.doctorProfile.specialization === 'object' 
                      ? doctor.doctorProfile.specialization.name 
                      : 'Specialist')
                  : 'Specialist';
                const doctorId = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor._id : favorite.doctorId;
                
                return (
                  <View key={favorite._id} style={styles.favouriteCard}>
                    <Image source={imageSource} style={styles.favouriteImage} defaultSource={defaultAvatar} />
                    <Text style={styles.favouriteName}>{doctorName}</Text>
                    <Text style={styles.favouriteSpeciality}>{specialization}</Text>
                    <TouchableOpacity
                      style={styles.favouriteBookButton}
                      onPress={() => (navigation as any).navigate('Home', { screen: 'Booking', params: { doctorId: String(doctorId) } })}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No upcoming appointments</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => (navigation as any).navigate('Home', { screen: 'Search' })}
              >
                <Text style={styles.emptyStateButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingAppointments.slice(0, 2).map((appointment) => {
              const doctor = appointment.doctorId;
              const doctorName = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor.fullName : 'Unknown Doctor';
              const doctorImage = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor.profileImage : null;
              const normalizedImageUrl = normalizeImageUrl(doctorImage);
              const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
              const specialization = (doctor && typeof doctor === 'object' && doctor !== null) && doctor.doctorProfile?.specialization 
                ? (typeof doctor.doctorProfile.specialization === 'object' 
                    ? doctor.doctorProfile.specialization.name 
                    : 'Specialist')
                : 'Specialist';
              const doctorId = (doctor && typeof doctor === 'object' && doctor !== null) ? doctor._id : appointment.doctorId;
              
              return (
                <View key={appointment._id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Image source={imageSource} style={styles.appointmentDoctorImage} defaultSource={defaultAvatar} />
                    <View style={styles.appointmentDoctorInfo}>
                      <Text style={styles.appointmentDoctorName}>{doctorName}</Text>
                      <Text style={styles.appointmentSpeciality}>{specialization}</Text>
                    </View>
                    <Ionicons
                      name={appointment.bookingType === 'ONLINE' ? 'calendar' : 'medical'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.appointmentDateTime}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.appointmentDateTimeText}>
                      {formatDateTime(appointment.appointmentDate, appointment.appointmentTime)}
                    </Text>
                  </View>
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity
                      style={styles.appointmentActionButton}
                      onPress={() => handleChat(String(doctorId), appointment._id)}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                      <Text style={styles.appointmentActionText}>Chat Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.appointmentActionButton, styles.appointmentActionButtonPrimary]}
                      onPress={() => handleViewAppointment(appointment._id)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.textWhite} />
                      <Text style={[styles.appointmentActionText, styles.appointmentActionTextWhite]}>
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  bookAppointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  bookAppointmentTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bookAppointmentSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  healthRecordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthRecordCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthRecordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  healthRecordLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  healthRecordValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthRecordValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  healthRecordChange: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  reportDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  favouriteCard: {
    width: 120,
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  favouriteImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  favouriteName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  favouriteSpeciality: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  favouriteBookButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentCard: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentDoctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  appointmentDoctorInfo: {
    flex: 1,
  },
  appointmentDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  appointmentSpeciality: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  appointmentDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  appointmentDateTimeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  appointmentActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appointmentActionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appointmentActionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
  appointmentActionTextWhite: {
    color: colors.textWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});

