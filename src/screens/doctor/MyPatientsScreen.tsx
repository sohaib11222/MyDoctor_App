import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as appointmentApi from '../../services/appointment';
import { API_BASE_URL } from '../../config/api';

type MyPatientsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'MyPatients'>;

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  gender: string;
  bloodGroup: string;
  dob: string | null;
  address: any;
  appointments: any[];
  lastBookingDate: Date | null;
  lastAppointment: any | null;
  hasActiveAppointment: boolean;
}

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

const defaultAvatar = require('../../../assets/avatar.png');

export const MyPatientsScreen = () => {
  const navigation = useNavigation<MyPatientsScreenNavigationProp>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState<string[]>(['all']);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all appointments for the doctor
  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorAppointments', dateRange.fromDate, dateRange.toDate],
    queryFn: () => {
      const params: any = {
        page: 1,
        limit: 1000, // Large limit to get all patients
      };
      if (dateRange.fromDate) params.fromDate = dateRange.fromDate;
      if (dateRange.toDate) params.toDate = dateRange.toDate;
      return appointmentApi.listAppointments(params);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Extract appointments from response
  const appointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    return appointmentsData.data.appointments || [];
  }, [appointmentsData]);

  // Group appointments by patient and create patient list
  const patients = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    const patientMap = new Map<string, Patient>();

    appointments.forEach((appointment: any) => {
      if (!appointment.patientId) return;

      const patientId = appointment.patientId._id || appointment.patientId;
      const patient = appointment.patientId;

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          _id: patientId,
          fullName: patient.fullName || 'Unknown',
          email: patient.email || '',
          phone: patient.phone || '',
          profileImage: patient.profileImage || null,
          gender: patient.gender || '',
          bloodGroup: patient.bloodGroup || '',
          dob: patient.dob || null,
          address: patient.address || {},
          appointments: [],
          lastBookingDate: null,
          lastAppointment: null,
          hasActiveAppointment: false,
        });
      }

      const patientData = patientMap.get(patientId)!;
      patientData.appointments.push(appointment);

      // Update last booking date
      const appointmentDate = new Date(appointment.appointmentDate);
      if (!patientData.lastBookingDate || appointmentDate > patientData.lastBookingDate) {
        patientData.lastBookingDate = appointmentDate;
        patientData.lastAppointment = appointment;
      }

      // Check if has active appointment (CONFIRMED or PENDING)
      if (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') {
        patientData.hasActiveAppointment = true;
      }
    });

    return Array.from(patientMap.values());
  }, [appointments]);

  // Calculate age from date of birth
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format date
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Format date and time
  const formatDateTime = (date: string, time?: string): string => {
    if (!date) return '';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return time ? `${dateStr} ${time}` : dateStr;
  };

  // Get location string
  const getLocation = (address: any): string => {
    if (!address) return 'N/A';
    const parts: string[] = [];
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Filter patients based on active/inactive tab
  const filteredPatientsByStatus = useMemo(() => {
    if (activeTab === 'active') {
      return patients.filter((p) => p.hasActiveAppointment);
    } else {
      return patients.filter((p) => !p.hasActiveAppointment);
    }
  }, [patients, activeTab]);

  // Apply search and other filters
  const filteredPatients = useMemo(() => {
    let filtered = [...filteredPatientsByStatus];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((patient) => {
        const name = (patient.fullName || '').toLowerCase();
        const email = (patient.email || '').toLowerCase();
        const phone = (patient.phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    // Appointment type filter
    if (appointmentTypeFilter.length > 0 && !appointmentTypeFilter.includes('all')) {
      filtered = filtered.filter((patient) => {
        return patient.appointments.some((apt) => {
          if (appointmentTypeFilter.includes('video') && apt.bookingType === 'ONLINE') return true;
          if (appointmentTypeFilter.includes('audio') && apt.bookingType === 'ONLINE') return true;
          if (appointmentTypeFilter.includes('chat') && apt.bookingType === 'ONLINE') return true;
          if (appointmentTypeFilter.includes('direct') && apt.bookingType === 'VISIT') return true;
          return false;
        });
      });
    }

    return filtered;
  }, [filteredPatientsByStatus, searchQuery, appointmentTypeFilter]);

  // Get counts
  const activeCount = useMemo(() => {
    return patients.filter((p) => p.hasActiveAppointment).length;
  }, [patients]);

  const inactiveCount = useMemo(() => {
    return patients.filter((p) => !p.hasActiveAppointment).length;
  }, [patients]);

  // Pagination
  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredPatients.slice(start, start + limit);
  }, [filteredPatients, page, limit]);

  const totalPages = Math.ceil(filteredPatients.length / limit);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePatientPress = (patientId: string) => {
    navigation.navigate('PatientProfile', { patientId });
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Patients</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load patients'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Patients</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => {
            setActiveTab('active');
            setPage(1);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active <Text style={styles.tabCount}>({activeCount})</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
          onPress={() => {
            setActiveTab('inactive');
            setPage(1);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>
            InActive <Text style={styles.tabCount}>({inactiveCount})</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {paginatedPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No patients found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? "You don't have any active patients yet."
                : "You don't have any inactive patients."}
            </Text>
          </View>
        ) : (
          <View style={styles.patientsGrid}>
            {paginatedPatients.map((patient) => {
              const age = calculateAge(patient.dob);
              const lastAppointment = patient.lastAppointment;
              const imageUri = normalizeImageUrl(patient.profileImage);

              return (
                <TouchableOpacity
                  key={patient._id}
                  style={styles.patientCard}
                  onPress={() => handlePatientPress(patient._id)}
                >
                  <View style={styles.patientHeader}>
                    <Image
                      source={imageUri ? { uri: imageUri } : defaultAvatar}
                      style={styles.patientAvatar}
                    />
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientId}>#{patient._id.slice(-6).toUpperCase()}</Text>
                      <Text style={styles.patientName}>{patient.fullName}</Text>
                      <View style={styles.patientDetails}>
                        {age && <Text style={styles.patientDetail}>Age: {age}</Text>}
                        {patient.gender && <Text style={styles.patientDetail}>{patient.gender}</Text>}
                        {patient.bloodGroup && <Text style={styles.patientDetail}>{patient.bloodGroup}</Text>}
                      </View>
                    </View>
                  </View>

                  <View style={styles.patientInfoSection}>
                    {lastAppointment && (
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                          {formatDateTime(lastAppointment.appointmentDate, lastAppointment.appointmentTime)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{getLocation(patient.address)}</Text>
                    </View>
                  </View>

                  <View style={styles.patientFooter}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.footerText}>
                      Last Booking{' '}
                      <Text style={styles.footerValue}>
                        {patient.lastBookingDate ? formatDate(patient.lastBookingDate) : 'N/A'}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
              onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <Text style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Page {page} of {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              <Text
                style={[styles.paginationButtonText, page === totalPages && styles.paginationButtonTextDisabled]}
              >
                Next
              </Text>
            </TouchableOpacity>
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
  header: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 12,
    color: colors.textLight,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  patientsGrid: {
    padding: 16,
    gap: 16,
  },
  patientCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    marginBottom: 16,
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
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  patientDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patientDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  patientInfoSection: {
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  patientFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerValue: {
    fontWeight: '600',
    color: colors.text,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: colors.textWhite,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationText: {
    fontSize: 14,
    color: colors.text,
  },
});

