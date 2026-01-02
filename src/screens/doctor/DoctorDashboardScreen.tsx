import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { MoreStackParamList, AppointmentsStackParamList, HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as doctorApi from '../../services/doctor';
import { API_BASE_URL } from '../../config/api';

type DoctorDashboardScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

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
 * Format date and time
 */
const formatDateTime = (date: string, time?: string): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `${dateStr} ${time}` : dateStr;
};

/**
 * Format currency
 */
const formatCurrency = (amount: number): string => {
  if (amount === null || amount === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const DoctorDashboardScreen = () => {
  const navigation = useNavigation<DoctorDashboardScreenNavigationProp>();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch dashboard data
  const { data: dashboardResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorDashboard'],
    queryFn: () => doctorApi.getDoctorDashboard(),
    refetchInterval: 30000, // Refetch every 30 seconds
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

  const stats = useMemo(() => {
    if (!dashboard) {
      return [
        { id: '1', title: 'Total Patients', value: '0', change: '0 This Week', changeType: 'positive' as const, icon: 'people' },
        { id: '2', title: "Today's Appointments", value: '0', change: 'No appointments', changeType: 'positive' as const, icon: 'calendar' },
        { id: '3', title: 'Revenue', value: '$0', change: 'From Appointments', changeType: 'positive' as const, icon: 'cash' },
      ];
    }
    return [
      {
        id: '1',
        title: 'Total Patients',
        value: String(dashboard.totalPatients || 0),
        change: `${dashboard.weeklyAppointments?.count || 0} This Week`,
        changeType: 'positive' as const,
        icon: 'people',
      },
      {
        id: '2',
        title: "Today's Appointments",
        value: String(dashboard.todayAppointments?.count || 0),
        change: (dashboard.todayAppointments?.count || 0) > 0 ? 'Active' : 'No appointments',
        changeType: 'positive' as const,
        icon: 'calendar',
      },
      {
        id: '3',
        title: 'Revenue',
        value: formatCurrency(dashboard.earningsFromAppointments || 0),
        change: 'From Appointments',
        changeType: 'positive' as const,
        icon: 'cash',
      },
    ];
  }, [dashboard]);

  const todayAppointments = useMemo(() => {
    return dashboard?.todayAppointments?.appointments || [];
  }, [dashboard]);

  const upcomingAppointments = useMemo(() => {
    return dashboard?.upcomingAppointments?.appointments || [];
  }, [dashboard]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderStatCard = ({ item }: { item: typeof stats[0] }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{item.title}</Text>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={[styles.statChange, styles.positiveChange]}>
          {item.change}
        </Text>
      </View>
      <View style={styles.statIcon}>
        <Ionicons name={item.icon as any} size={32} color={colors.primary} />
      </View>
    </View>
  );

  const renderAppointment = ({ item }: { item: doctorApi.Appointment }) => {
    const patient = typeof item.patientId === 'object' ? item.patientId : null;
    const patientId = patient?._id || (typeof item.patientId === 'string' ? item.patientId : '');
    const patientName = patient?.fullName || 'Unknown Patient';
    const patientImage = patient?.profileImage ? normalizeImageUrl(patient.profileImage) : null;
    const appointmentNumber = item.appointmentNumber || `#${item._id.slice(-6)}`;

    return (
      <TouchableOpacity
        style={styles.appointmentItem}
        onPress={() => {
          (navigation as any).navigate('Appointments', {
            screen: 'AppointmentDetails',
            params: { appointmentId: item._id },
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.patientInfo}>
          <Image
            source={patientImage ? { uri: patientImage } : defaultAvatar}
            style={styles.patientAvatar}
            defaultSource={defaultAvatar}
          />
          <View style={styles.patientDetails}>
            <Text style={styles.appointmentId}>{appointmentNumber}</Text>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
        </View>
        <View style={styles.appointmentMeta}>
          <Text style={styles.appointmentDate}>{formatDateTime(item.appointmentDate, item.appointmentTime)}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.bookingType === 'ONLINE' ? 'Online' : 'Visit'}</Text>
          </View>
        </View>
        <View style={styles.appointmentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              (navigation as any).navigate('Chat', {
                screen: 'ChatDetail',
                params: { 
                  conversationId: item._id,
                  patientId: patientId,
                  appointmentId: item._id,
                },
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              (navigation as any).navigate('Appointments', {
                screen: 'AppointmentDetails',
                params: { appointmentId: item._id },
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={20} color={colors.success} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Recent invoices - placeholder for now (would need separate API)
  const recentInvoices: any[] = [];

  const renderInvoice = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No recent invoices</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Invoices')}
        style={styles.emptyStateButton}
      >
        <Text style={styles.emptyStateButtonText}>View All Invoices</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Error loading dashboard</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <FlatList
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsList}
          />
        </View>

        {/* Today's Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            <TouchableOpacity
              onPress={() => {
                (navigation as any).navigate('Appointments', { screen: 'Appointments' });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {todayAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No appointments scheduled for today</Text>
            </View>
          ) : (
            <FlatList
              data={todayAppointments.slice(0, 5)}
              renderItem={renderAppointment}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Upcoming Appointments Section */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              <TouchableOpacity
                onPress={() => {
                  (navigation as any).navigate('Appointments', { screen: 'Appointments' });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={upcomingAppointments.slice(0, 3)}
              renderItem={renderAppointment}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Recent Invoices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Invoices')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {renderInvoice()}
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
  statsContainer: {
    marginTop: 16,
  },
  statsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: 160,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statChange: {
    fontSize: 11,
  },
  positiveChange: {
    color: colors.success,
  },
  negativeChange: {
    color: colors.error,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.background,
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appointmentMeta: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  appointmentDate: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  invoiceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 16,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceDate: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 12,
    color: colors.text,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
});

