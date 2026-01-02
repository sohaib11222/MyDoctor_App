import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { HomeStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as doctorApi from '../../services/doctor';
import * as productApi from '../../services/product';
import * as appointmentApi from '../../services/appointment';
import * as patientApi from '../../services/patient';
import * as favoriteApi from '../../services/favorite';
import * as specializationApi from '../../services/specialization';
import { API_BASE_URL } from '../../config/api';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

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
const formatDate = (date: string): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const userId = user?._id || user?.id;
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch dashboard data for doctors
  const { data: dashboardResponse, isLoading: dashboardLoading, error, refetch: refetchDashboard } = useQuery({
    queryKey: ['doctorDashboard'],
    queryFn: () => doctorApi.getDoctorDashboard(),
    enabled: isDoctor,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

  // Fetch products count for doctor
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['doctorProducts', userId],
    queryFn: () => productApi.listProducts({ sellerId: userId, limit: 1 }),
    enabled: isDoctor && !!userId,
    retry: 1,
  });

  // Fetch all appointments to get all patients
  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['doctorAllAppointments', userId],
    queryFn: () => appointmentApi.listAppointments({ page: 1, limit: 1000 }),
    enabled: isDoctor && !!userId,
    retry: 1,
  });

  const dashboard = useMemo(() => {
    if (!dashboardResponse) return null;
    const responseData = dashboardResponse.data || dashboardResponse;
    if (responseData && (responseData.totalPatients !== undefined || responseData.todayAppointments !== undefined)) {
      return responseData;
    }
    if (responseData && responseData.data && typeof responseData.data === 'object') {
      return responseData.data;
    }
    return responseData;
  }, [dashboardResponse]);

  // Get total products count
  const totalProducts = useMemo(() => {
    if (!productsResponse?.data?.pagination) return 0;
    return productsResponse.data.pagination.total || 0;
  }, [productsResponse]);

  // Get all patients from all appointments
  const allPatients = useMemo(() => {
    if (!appointmentsResponse?.data?.appointments) return [];
    const patients = new Map();
    appointmentsResponse.data.appointments.forEach((apt: any) => {
      if (!apt.patientId) return;
      const patient = typeof apt.patientId === 'object' ? apt.patientId : null;
      const patientId = patient?._id || (typeof apt.patientId === 'string' ? apt.patientId : '');
      if (patientId && !patients.has(patientId)) {
        const appointmentDate = new Date(apt.appointmentDate);
        const existingPatient = patients.get(patientId);
        if (!existingPatient || appointmentDate > new Date(existingPatient.lastAppointment)) {
          patients.set(patientId, {
            patient,
            patientId,
            lastAppointment: apt.appointmentDate,
          });
        }
      }
    });
    // Sort by last appointment date (most recent first) and return all
    return Array.from(patients.values()).sort((a, b) => {
      const dateA = new Date(a.lastAppointment).getTime();
      const dateB = new Date(b.lastAppointment).getTime();
      return dateB - dateA;
    });
  }, [appointmentsResponse]);

  const isLoading = dashboardLoading || productsLoading || appointmentsLoading;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard()]);
    setRefreshing(false);
  }, [refetchDashboard]);

  // Doctor Home Screen
  if (isDoctor) {
    if (isLoading && !dashboard) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Hello, Dr. {user?.name?.split(' ')[0] || 'Doctor'}</Text>
            <Text style={styles.title}>My Patients</Text>
            <Text style={styles.subtitle}>Manage your patients and appointments</Text>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('PatientSearch')}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.searchPlaceholder}>Search patients...</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{dashboard?.totalPatients || 0}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cube-outline" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star" size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>
              {dashboard?.rating?.average ? dashboard.rating.average.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.statLabel}>
              Rating ({dashboard?.rating?.count || 0})
            </Text>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const tabNavigator = navigation.getParent();
              if (tabNavigator) {
                (tabNavigator as any).navigate('Products', { screen: 'AddProduct' });
              }
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const tabNavigator = navigation.getParent();
              if (tabNavigator) {
                (tabNavigator as any).navigate('More', { screen: 'PharmacyManagement' });
              }
            }}
          >
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>My Pharmacy</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Patients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Patients</Text>
            <TouchableOpacity
              onPress={() => {
                // Navigate to More tab and then to MyPatients screen
                const tabNavigator = navigation.getParent();
                if (tabNavigator) {
                  (tabNavigator as any).navigate('More', { screen: 'MyPatients' });
                }
              }}
            >
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {allPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No patients found</Text>
            </View>
          ) : (
            allPatients.map((item: any, index: number) => {
              const patient = item.patient;
              const patientId = item.patientId;
              const patientName = patient?.fullName || 'Unknown Patient';
              const patientImage = patient?.profileImage ? normalizeImageUrl(patient.profileImage) : null;
              
              return (
                <TouchableOpacity
                  key={patientId || index}
                  style={styles.patientCard}
                  onPress={() => (navigation as any).navigate('PatientProfile', { patientId })}
                >
                  <Image
                    source={patientImage ? { uri: patientImage } : defaultAvatar}
                    style={styles.patientAvatar}
                    defaultSource={defaultAvatar}
                  />
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <Text style={styles.patientId}>ID: {patientId?.slice(-6).toUpperCase() || 'N/A'}</Text>
                    <Text style={styles.lastAppointment}>Last Appointment: {formatDate(item.lastAppointment)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  }

  // Patient Home Screen - Fetch real data
  const { data: patientDashboardResponse, isLoading: patientDashboardLoading } = useQuery({
    queryKey: ['patientDashboard'],
    queryFn: () => patientApi.getPatientDashboard(),
    enabled: !isDoctor && !!user,
    retry: 1,
  });

  const { data: patientFavoritesData } = useQuery({
    queryKey: ['favorites', userId, 'home'],
    queryFn: () => favoriteApi.listFavorites(String(userId), { page: 1, limit: 3 }),
    enabled: !isDoctor && !!userId,
  });

  // Fetch specializations
  const { data: specializationsData } = useQuery({
    queryKey: ['specializations', 'home'],
    queryFn: () => specializationApi.getAllSpecializations(),
    enabled: !isDoctor,
    retry: 1,
  });

  // Fetch featured doctors
  const { data: featuredDoctorsData } = useQuery({
    queryKey: ['featuredDoctors', 'home'],
    queryFn: () => doctorApi.listDoctors({ isFeatured: true, limit: 5 }),
    enabled: !isDoctor,
    retry: 1,
  });

  const patientDashboard = useMemo(() => {
    if (!patientDashboardResponse) return null;
    const responseData = patientDashboardResponse.data || patientDashboardResponse;
    return responseData;
  }, [patientDashboardResponse]);

  const patientFavorites = useMemo(() => {
    if (!patientFavoritesData) return [];
    const responseData = patientFavoritesData.data || patientFavoritesData;
    return Array.isArray(responseData) ? responseData : (responseData.favorites || []);
  }, [patientFavoritesData]);

  const upcomingAppointmentsForPatient = useMemo(() => {
    return patientDashboard?.upcomingAppointments?.appointments || [];
  }, [patientDashboard]);

  // Extract specializations
  const specializations = useMemo(() => {
    if (!specializationsData) return [];
    const responseData = specializationsData.data || specializationsData;
    return Array.isArray(responseData) ? responseData : [];
  }, [specializationsData]);

  // Extract featured doctors
  const featuredDoctors = useMemo(() => {
    if (!featuredDoctorsData) return [];
    const responseData = featuredDoctorsData.data || featuredDoctorsData;
    return Array.isArray(responseData) ? responseData : (responseData.doctors || []);
  }, [featuredDoctorsData]);

  // Patient Home Screen
  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Patient'}</Text>
          <Text style={styles.title}>Find Your Doctor</Text>
          <Text style={styles.subtitle}>Book appointments easily and quickly</Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder}>Search doctors, specialities...</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Button
          title="Pharmacies"
          onPress={() => {
            const tabNavigator = navigation.getParent();
            if (tabNavigator) {
              (tabNavigator as any).navigate('Pharmacy', { screen: 'PharmacySearch' });
            }
          }}
          style={styles.primaryButton}
        />
        <Button
          title="Find Doctor"
          onPress={() => navigation.navigate('Search')}
          variant="outline"
          style={styles.secondaryButton}
        />
      </View>

      {/* Upcoming Appointments Section */}
      {upcomingAppointmentsForPatient.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => {
              const tabNavigator = navigation.getParent();
              if (tabNavigator) {
                (tabNavigator as any).navigate('Appointments');
              }
            }}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingAppointmentsForPatient.slice(0, 2).map((appointment: any) => {
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
              <TouchableOpacity
                key={appointment._id}
                style={styles.appointmentCard}
                onPress={() => {
                  const tabNavigator = navigation.getParent();
                  if (tabNavigator) {
                    (tabNavigator as any).navigate('Appointments', { screen: 'AppointmentDetails', params: { appointmentId: appointment._id } });
                  }
                }}
              >
                <Image source={imageSource} style={styles.appointmentDoctorImage} defaultSource={defaultAvatar} />
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentDoctorName}>{doctorName}</Text>
                  <Text style={styles.appointmentSpeciality}>{specialization}</Text>
                  <View style={styles.appointmentDateTime}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.appointmentDateTimeText}>
                      {formatDate(appointment.appointmentDate)} - {appointment.appointmentTime}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Favorites Section */}
      {patientFavorites.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Doctors</Text>
            <TouchableOpacity onPress={() => {
              const tabNavigator = navigation.getParent();
              if (tabNavigator) {
                (tabNavigator as any).navigate('More', { screen: 'Favourites' });
              }
            }}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorsScroll}>
            {patientFavorites.slice(0, 3).map((favorite: any) => {
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
                <Card key={favorite._id} style={styles.doctorCard}>
                  <Image source={imageSource} style={styles.doctorAvatar} defaultSource={defaultAvatar} />
                  <Text style={styles.doctorName}>{doctorName}</Text>
                  <Text style={styles.doctorSpecialty}>{specialization}</Text>
                  <Button
                    title="Book"
                    onPress={() => navigation.navigate('Booking', { doctorId: String(doctorId) })}
                    size="small"
                    style={styles.bookButton}
                  />
                </Card>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Specialities Section */}
      {specializations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialities</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.specialitiesScroll}
          >
            {specializations.slice(0, 6).map((specialization) => (
              <TouchableOpacity
                key={specialization._id}
                style={styles.specialityCard}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.specialityIcon}>⚕️</Text>
                <Text style={styles.specialityName}>{specialization.name}</Text>
                <Text style={styles.specialityCount}>View Doctors</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Doctors Section */}
      {featuredDoctors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Doctors</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.doctorsScroll}
          >
            {featuredDoctors.slice(0, 5).map((doctor: any) => {
              const doctorId = doctor._id || doctor.userId?._id;
              const doctorName = doctor.userId?.fullName || doctor.fullName || 'Unknown Doctor';
              const doctorImage = doctor.userId?.profileImage || doctor.profileImage;
              const normalizedImageUrl = normalizeImageUrl(doctorImage);
              const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
              const specialization = doctor.doctorProfile?.specialization 
                ? (typeof doctor.doctorProfile.specialization === 'object' 
                    ? doctor.doctorProfile.specialization.name 
                    : doctor.doctorProfile.specialization)
                : doctor.specialization 
                ? (typeof doctor.specialization === 'object' ? doctor.specialization.name : doctor.specialization)
                : 'Specialist';
              const location = doctor.doctorProfile?.clinics?.[0] 
                ? `${doctor.doctorProfile.clinics[0].city || ''}, ${doctor.doctorProfile.clinics[0].state || ''}`.trim() || 'Location not available'
                : 'Location not available';
              const consultationFee = doctor.doctorProfile?.consultationFee 
                || doctor.doctorProfile?.consultationFees?.clinic 
                || doctor.doctorProfile?.consultationFees?.online 
                || 0;
              const rating = doctor.doctorProfile?.ratingAvg 
                || doctor.rating?.average 
                || 0;
              
              return (
                <Card key={doctorId} style={styles.doctorCard}>
                  <View style={styles.doctorHeader}>
                    <Image source={imageSource} style={styles.doctorAvatarImage} defaultSource={defaultAvatar} />
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  </View>
                  <Text style={styles.doctorName}>{doctorName}</Text>
                  <Text style={styles.doctorSpecialty}>{specialization}</Text>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorLocation}>📍 {location}</Text>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <View style={styles.doctorFooter}>
                    <Text style={styles.doctorFee}>${consultationFee}</Text>
                    <Button
                      title="Book"
                      onPress={() => navigation.navigate('DoctorProfile', { doctorId: String(doctorId) })}
                      size="small"
                      style={styles.bookButton}
                    />
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Why Choose Us Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Choose Us</Text>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>🏥</Text>
          <Text style={styles.featureTitle}>Qualified Doctors</Text>
          <Text style={styles.featureDescription}>
            Our team consists of highly qualified and experienced medical professionals.
          </Text>
        </Card>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>⏰</Text>
          <Text style={styles.featureTitle}>24/7 Availability</Text>
          <Text style={styles.featureDescription}>
            Book appointments anytime, anywhere with our easy-to-use platform.
          </Text>
        </Card>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>💬</Text>
          <Text style={styles.featureTitle}>Easy Communication</Text>
          <Text style={styles.featureDescription}>
            Chat with your doctor directly through our secure messaging system.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: colors.textWhite,
    opacity: 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textWhite,
    opacity: 0.9,
    marginTop: 8,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  searchBar: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: colors.textLight,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  specialitiesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  specialityCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialityIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  specialityName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  specialityCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  doctorsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  doctorCard: {
    width: width * 0.75,
    marginRight: 16,
    padding: 16,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doctorAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  doctorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  availableBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableText: {
    fontSize: 10,
    color: colors.textWhite,
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  doctorInfo: {
    marginBottom: 12,
  },
  doctorLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  doctorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  doctorFee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featureCard: {
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Doctor-specific styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  lastAppointment: {
    fontSize: 12,
    color: colors.textLight,
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
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  appointmentDoctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  appointmentInfo: {
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
    marginBottom: 4,
  },
  appointmentDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  appointmentDateTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

