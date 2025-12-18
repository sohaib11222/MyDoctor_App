import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type AppointmentsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentsScreen'>;

interface Appointment {
  id: string;
  doctor: string;
  doctorImg: any; // Changed to any for require() images
  date: string;
  types: string[];
  email: string;
  phone: string;
  isNew?: boolean;
  status: 'upcoming' | 'cancelled' | 'completed';
}

const AppointmentsScreen = () => {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const [activeTab, setActiveTab] = useState<'upcoming' | 'cancelled' | 'completed'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Patient appointments (for patients)
  const patientUpcomingAppointments: Appointment[] = [
    { id: '#Apt0001', doctor: 'Dr Edalin', doctorImg: require('../../../assets/avatar.png'), date: '11 Nov 2024 10.45 AM', types: ['General Visit', 'Video Call'], email: 'edalin@example.com', phone: '+1 504 368 6874', status: 'upcoming' },
    { id: '#Apt0002', doctor: 'Dr.Shanta', doctorImg: require('../../../assets/avatar.png'), date: '05 Nov 2024 11.50 AM', types: ['General Visit', 'Audio Call'], email: 'shanta@example.com', phone: '+1 832 891 8403', isNew: true, status: 'upcoming' },
    { id: '#Apt0003', doctor: 'Dr.John', doctorImg: require('../../../assets/avatar.png'), date: '27 Oct 2024 09.30 AM', types: ['General Visit', 'Video Call'], email: 'john@example.com', phone: '+1 749 104 6291', status: 'upcoming' },
    { id: '#Apt0004', doctor: 'Dr.Susan', doctorImg: require('../../../assets/avatar.png'), date: '18 Oct 2024 12.20 PM', types: ['General Visit', 'Direct Visit'], email: 'susan@example.com', phone: '+1 584 920 7183', status: 'upcoming' },
  ];

  const patientCancelledAppointments: Appointment[] = [
    { id: '#Apt0005', doctor: 'Dr.Michael', doctorImg: require('../../../assets/avatar.png'), date: '15 Oct 2024 02.00 PM', types: ['General Visit'], email: 'michael@example.com', phone: '+1 234 567 8901', status: 'cancelled' },
  ];

  const patientCompletedAppointments: Appointment[] = [
    { id: '#Apt0006', doctor: 'Dr.Sarah', doctorImg: require('../../../assets/avatar.png'), date: '10 Oct 2024 03.30 PM', types: ['General Visit', 'Video Call'], email: 'sarah@example.com', phone: '+1 987 654 3210', status: 'completed' },
  ];

  // Doctor appointments (for doctors - showing patients)
  const doctorUpcomingAppointments: Appointment[] = [
    { id: '#Apt0001', doctor: 'Adrian Marshall', doctorImg: require('../../../assets/avatar.png'), date: '11 Nov 2024 10.45 AM', types: ['General Visit', 'Direct Visit'], email: 'adrian@example.com', phone: '+1 504 368 6874', status: 'upcoming' },
    { id: '#Apt0002', doctor: 'Kelly Stevens', doctorImg: require('../../../assets/avatar.png'), date: '05 Nov 2024 11.50 AM', types: ['General Visit', 'Video Call'], email: 'kelly@example.com', phone: '+1 832 891 8403', isNew: true, status: 'upcoming' },
    { id: '#Apt0003', doctor: 'Samuel Anderson', doctorImg: require('../../../assets/avatar.png'), date: '27 Oct 2024 09.30 AM', types: ['General Visit', 'Audio Call'], email: 'samuel@example.com', phone: '+1 749 104 6291', status: 'upcoming' },
  ];

  const doctorCancelledAppointments: Appointment[] = [
    { id: '#Apt0005', doctor: 'Catherine Griffin', doctorImg: require('../../../assets/avatar.png'), date: '15 Oct 2024 02.00 PM', types: ['General Visit'], email: 'catherine@example.com', phone: '+1 234 567 8901', status: 'cancelled' },
  ];

  const doctorCompletedAppointments: Appointment[] = [
    { id: '#Apt0006', doctor: 'Robert Hutchinson', doctorImg: require('../../../assets/avatar.png'), date: '10 Oct 2024 03.30 PM', types: ['General Visit', 'Video Call'], email: 'robert@example.com', phone: '+1 987 654 3210', status: 'completed' },
  ];

  const upcomingAppointments = isDoctor ? doctorUpcomingAppointments : patientUpcomingAppointments;
  const cancelledAppointments = isDoctor ? doctorCancelledAppointments : patientCancelledAppointments;
  const completedAppointments = isDoctor ? doctorCompletedAppointments : patientCompletedAppointments;

  const getAppointments = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingAppointments;
      case 'cancelled':
        return cancelledAppointments;
      case 'completed':
        return completedAppointments;
      default:
        return [];
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'upcoming':
        return upcomingAppointments.length;
      case 'cancelled':
        return cancelledAppointments.length;
      case 'completed':
        return completedAppointments.length;
      default:
        return 0;
    }
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.doctorInfo}>
          <Image source={item.doctorImg} style={styles.doctorImage} />
          <View style={styles.doctorDetails}>
            <View style={styles.appointmentIdRow}>
              <Text style={styles.appointmentId}>{item.id}</Text>
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
            </View>
            <Text style={styles.doctorName}>{isDoctor ? item.doctor : item.doctor}</Text>
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
              navigation.navigate('StartAppointment', { appointmentId: item.id });
            } else {
              // Patient action - navigate to details
              navigation.navigate('AppointmentDetails', { appointmentId: item.id });
            }
          }}
        >
          <Ionicons name={isDoctor ? "play-outline" : "calendar-outline"} size={16} color={colors.textWhite} />
          <Text style={styles.attendBtnText}>{isDoctor ? 'Start Session' : 'Attend'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

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
      <FlatList
        data={getAppointments()}
        renderItem={renderAppointmentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No {activeTab} appointments</Text>
          </View>
        }
      />
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
});

export default AppointmentsScreen;
