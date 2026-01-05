import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
    
    // Replace localhost with device host (simpler approach)
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    
    // Replace 127.0.0.1 with device host
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    
    if (__DEV__) {
      console.log('🖼️ Normalized URL:', normalizedUrl, '(from:', trimmedUri, ')');
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

type AppointmentsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentsScreen'>;

// UI Appointment interface (for display)
interface UIAppointment {
  id: string;
  appointmentId: string; // Backend _id
  name: string; // Patient name (for doctor) or Doctor name (for patient)
  imageUri?: string;
  date: string;
  types: string[];
  email: string;
  phone: string;
  isNew?: boolean;
  status: 'upcoming' | 'cancelled' | 'completed';
  appointmentStatus: string; // Backend status
}

const AppointmentsScreen = () => {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDoctor = user?.role === 'doctor';
  const [activeTab, setActiveTab] = useState<'upcoming' | 'cancelled' | 'completed'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Determine status filter based on active tab
  const getStatusFilter = (): appointmentApi.AppointmentFilters['status'][] => {
    switch (activeTab) {
      case 'upcoming':
        return ['PENDING', 'CONFIRMED']; // Show both pending and confirmed as upcoming
      case 'cancelled':
        return ['CANCELLED', 'REJECTED'];
      case 'completed':
        return ['COMPLETED', 'NO_SHOW'];
      default:
        return [];
    }
  };

  // Fetch appointments for doctors (using real API)
  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['appointments', isDoctor ? 'doctor' : 'patient', activeTab],
    queryFn: async () => {
      const statuses = getStatusFilter();
      
      // Fetch all statuses for the active tab
      const allPromises = statuses.map(status =>
        appointmentApi.listAppointments({
          status,
          page: 1,
          limit: 100, // Get all for now, can add pagination later
        })
      );
      
      const results = await Promise.all(allPromises);
      
      // Combine all appointments
      let allAppointments: appointmentApi.Appointment[] = [];
      
      results.forEach(result => {
        const responseData = result.data || result;
        if (responseData?.appointments) {
          allAppointments = [...allAppointments, ...responseData.appointments];
        }
      });
      
      // Sort by date (newest first)
      allAppointments.sort((a, b) => {
        const dateA = new Date(a.appointmentDate);
        const dateB = new Date(b.appointmentDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // If same date, sort by time
        return b.appointmentTime.localeCompare(a.appointmentTime);
      });
      
      return allAppointments;
    },
    enabled: !!user, // Only fetch if user is logged in
    retry: 1,
  });

  // Get tab counts
  const { data: tabCounts } = useQuery({
    queryKey: ['appointmentTabCounts', isDoctor ? 'doctor' : 'patient'],
    queryFn: async () => {
      const [pending, confirmed, cancelled, rejected, completed, noShow] = await Promise.all([
        appointmentApi.listAppointments({ status: 'PENDING', limit: 1 }),
        appointmentApi.listAppointments({ status: 'CONFIRMED', limit: 1 }),
        appointmentApi.listAppointments({ status: 'CANCELLED', limit: 1 }),
        appointmentApi.listAppointments({ status: 'REJECTED', limit: 1 }),
        appointmentApi.listAppointments({ status: 'COMPLETED', limit: 1 }),
        appointmentApi.listAppointments({ status: 'NO_SHOW', limit: 1 }),
      ]);
      
      return {
        upcoming: (pending.data?.pagination?.total || 0) + (confirmed.data?.pagination?.total || 0),
        cancelled: (cancelled.data?.pagination?.total || 0) + (rejected.data?.pagination?.total || 0),
        completed: (completed.data?.pagination?.total || 0) + (noShow.data?.pagination?.total || 0),
      };
    },
    enabled: !!user,
  });

  // Convert backend appointments to UI format
  const uiAppointments = useMemo(() => {
    if (!appointmentsData) return [];
    
    return appointmentsData
      .filter(apt => {
        // Filter by search query if provided
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const patientName = apt.patientId?.fullName?.toLowerCase() || '';
          const doctorName = apt.doctorId?.fullName?.toLowerCase() || '';
          const appointmentNumber = apt.appointmentNumber?.toLowerCase() || '';
          return patientName.includes(searchLower) || doctorName.includes(searchLower) || appointmentNumber.includes(searchLower);
        }
        return true;
      })
      .map(apt => {
        const appointmentDate = new Date(apt.appointmentDate);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const formattedTime = apt.appointmentTime;
        const dateTimeString = `${formattedDate} ${formattedTime}`;
        
        // Determine if appointment is new (PENDING status and created recently)
        const isNew = apt.status === 'PENDING' && 
          new Date(apt.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Within last 24 hours
        
        // Get name and image based on role
        const name = isDoctor 
          ? apt.patientId?.fullName || 'Unknown Patient'
          : apt.doctorId?.fullName || 'Unknown Doctor';
        const imageUri = isDoctor 
          ? apt.patientId?.profileImage 
          : apt.doctorId?.profileImage;
        const email = isDoctor 
          ? apt.patientId?.email || ''
          : apt.doctorId?.email || '';
        const phone = isDoctor 
          ? apt.patientId?.phone || ''
          : apt.doctorId?.phone || '';
        
        // Build types array
        const types: string[] = [];
        if (apt.bookingType === 'VISIT') {
          types.push('Direct Visit');
          if (apt.clinicName) {
            types.push(apt.clinicName);
          }
        } else if (apt.bookingType === 'ONLINE') {
          types.push('Online');
        }
        
        return {
          id: apt.appointmentNumber || apt._id,
          appointmentId: apt._id,
          name,
          imageUri,
          date: dateTimeString,
          types,
          email,
          phone,
          isNew,
          status: activeTab as 'upcoming' | 'cancelled' | 'completed',
          appointmentStatus: apt.status,
        } as UIAppointment;
      });
  }, [appointmentsData, searchQuery, isDoctor, activeTab]);

  const getTabCount = (tab: string) => {
    if (!tabCounts) return 0;
    switch (tab) {
      case 'upcoming':
        return tabCounts.upcoming;
      case 'cancelled':
        return tabCounts.cancelled;
      case 'completed':
        return tabCounts.completed;
      default:
        return 0;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['appointmentTabCounts'] }),
    ]);
    setRefreshing(false);
  };

  const renderAppointmentCard = ({ item }: { item: UIAppointment }) => {
    // Default avatar if no image
    const defaultAvatar = require('../../../assets/avatar.png');
    
    // Normalize image URL for mobile (replaces localhost with device IP)
    const normalizedImageUrl = normalizeImageUrl(item.imageUri);
    const imageSource = normalizedImageUrl 
      ? { uri: normalizedImageUrl }
      : defaultAvatar;
    
    // Debug logging
    if (__DEV__ && item.imageUri) {
      console.log('🖼️ Original imageUri:', item.imageUri);
      console.log('🖼️ Normalized URL:', normalizedImageUrl);
    }
    
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.appointmentId })}
        activeOpacity={0.7}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.doctorInfo}>
            <Image source={imageSource} style={styles.doctorImage} />
            <View style={styles.doctorDetails}>
              <View style={styles.appointmentIdRow}>
                <Text style={styles.appointmentId}>{item.id}</Text>
                {item.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </View>
              <Text style={styles.doctorName}>{item.name}</Text>
            </View>
          </View>
        <View style={styles.appointmentActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.appointmentInfo}>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={styles.typesContainer}>
          {item.types.map((type, index) => (
            <View key={index} style={styles.typeBadge}>
              <Text style={styles.typeText}>{type}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.contactText}>{item.phone}</Text>
        </View>
      </View>

      {activeTab === 'upcoming' && (
        <TouchableOpacity 
          style={styles.attendBtn} 
          activeOpacity={0.8}
          onPress={() => {
            if (isDoctor) {
              navigation.navigate('StartAppointment', { appointmentId: item.appointmentId });
            } else {
              // Patient action - navigate to details
              navigation.navigate('AppointmentDetails', { appointmentId: item.appointmentId });
            }
          }}
        >
          <Ionicons name={isDoctor ? "play-outline" : "calendar-outline"} size={16} color={colors.textWhite} />
          <Text style={styles.attendBtnText}>{isDoctor ? 'Start Session' : 'Attend'}</Text>
        </TouchableOpacity>
      )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Appointments</Text>
          {isDoctor && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => navigation.navigate('AppointmentRequests')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textWhite} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => navigation.navigate('AvailableTimings')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={colors.textWhite} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search appointments"
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming
            </Text>
            <View style={[styles.tabBadge, activeTab === 'upcoming' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'upcoming' && styles.tabBadgeTextActive]}>
                {getTabCount('upcoming')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cancelled' && styles.tabActive]}
            onPress={() => setActiveTab('cancelled')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>
              Cancelled
            </Text>
            <View style={[styles.tabBadge, activeTab === 'cancelled' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'cancelled' && styles.tabBadgeTextActive]}>
                {getTabCount('cancelled')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completed
            </Text>
            <View style={[styles.tabBadge, activeTab === 'completed' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'completed' && styles.tabBadgeTextActive]}>
                {getTabCount('completed')}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.filterText}>From Date - To Date</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.filterText}>Filter By</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Failed to load appointments</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={uiAppointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.appointmentId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No {activeTab} appointments</Text>
            </View>
          }
        />
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
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomRightRadius:30,
    borderBottomLeftRadius:30,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textWhite,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginTop: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  tabsContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: 6,
  },
  tabTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textWhite,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  appointmentIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentId: {
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
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appointmentActions: {
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
  appointmentInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  attendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  attendBtnText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textTransform: 'capitalize',
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

export default AppointmentsScreen;
