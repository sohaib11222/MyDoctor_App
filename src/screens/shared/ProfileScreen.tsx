import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { MoreStackParamList, TabParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as profileApi from '../../services/profile';
import { API_BASE_URL } from '../../config/api';
import { useTranslation } from 'react-i18next';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

interface Appointment {
  id: string;
  doctor: string;
  doctorImg: any;
  apptDate: string;
  bookingDate: string;
  amount: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
}

interface Prescription {
  id: string;
  doctor: string;
  doctorImg: any;
  type: string;
  date: string;
}

interface MedicalRecord {
  name: string;
  date: string;
  description: string;
}

interface Billing {
  date: string;
  amount: string;
  status: 'Paid' | 'Unpaid';
}

const appointments: Appointment[] = [
  {
    id: '#Apt123',
    doctor: 'Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
    apptDate: '24 Mar 2024',
    bookingDate: '21 Mar 2024',
    amount: '$300',
    status: 'Upcoming',
  },
  {
    id: '#Apt124',
    doctor: 'John Homes',
    doctorImg: require('../../../assets/avatar.png'),
    apptDate: '17 Mar 2024',
    bookingDate: '14 Mar 2024',
    amount: '$450',
    status: 'Upcoming',
  },
  {
    id: '#Apt125',
    doctor: 'Shanta Neill',
    doctorImg: require('../../../assets/avatar.png'),
    apptDate: '11 Mar 2024',
    bookingDate: '07 Mar 2024',
    amount: '$250',
    status: 'Upcoming',
  },
];

const prescriptions: Prescription[] = [
  {
    id: '#P123',
    doctor: 'Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
    type: 'Visit',
    date: '25 Jan 2024',
  },
  {
    id: '#P124',
    doctor: 'John Homes',
    doctorImg: require('../../../assets/avatar.png'),
    type: 'Visit',
    date: '28 Jan 2024',
  },
];

const medicalRecords: MedicalRecord[] = [
  { name: 'Lab Report', date: '24 Mar 2024', description: 'Glucose Test V12' },
  { name: 'Lab Report', date: '27 Mar 2024', description: 'Complete Blood Count(CBC)' },
  { name: 'Lab Report', date: '10 Apr 2024', description: 'Echocardiogram' },
];

const billing: Billing[] = [
  { date: '24 Mar 2024', amount: '$300', status: 'Paid' },
  { date: '28 Mar 2024', amount: '$350', status: 'Paid' },
  { date: '10 Apr 2024', amount: '$400', status: 'Paid' },
];

export const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isDoctor = user?.role === 'doctor';
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescription' | 'medical' | 'billing'>('appointments');
  const [searchQuery, setSearchQuery] = useState('');

  // Get user ID
  const userId = user?._id || user?.id;

  // Fetch user profile
  const { data: userProfile, isLoading: userProfileLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => profileApi.getUserProfile(userId!),
    enabled: !!userId && !isDoctor,
  });

  // Fetch doctor profile
  const { data: doctorProfile, isLoading: doctorProfileLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => profileApi.getDoctorProfile(),
    enabled: !!userId && isDoctor,
  });

  // Extract profile data
  const profileData = useMemo(() => {
    if (isDoctor && doctorProfile) {
      const doctor = doctorProfile.data as profileApi.DoctorProfile;
      const userData = (doctor as any).userId || user;
      return {
        name: userData?.fullName || user?.name || t('common.doctor'),
        email: userData?.email || user?.email || '',
        phone: userData?.phone || '',
        profileImage: userData?.profileImage || user?.profileImage,
        specialization: typeof doctor.specialization === 'object' 
          ? doctor.specialization?.name 
          : doctor.specialization || t('common.general'),
        title: doctor.title || '',
        biography: doctor.biography || '',
        rating: doctor.ratingAvg || 0,
        ratingCount: doctor.ratingCount || 0,
        experienceYears: doctor.experienceYears || 0,
        isVerified: doctor.isVerified || false,
      };
    } else if (!isDoctor && userProfile) {
      const userData = userProfile.data as profileApi.UserProfile;
      return {
        name: userData.fullName || user?.name || t('common.patient'),
        email: userData.email || user?.email || '',
        phone: userData.phone || '',
        profileImage: userData.profileImage || user?.profileImage,
        bloodGroup: userData.bloodGroup || '',
        gender: userData.gender || '',
        dob: userData.dob || '',
        rating: 0,
        ratingCount: 0,
        experienceYears: 0,
        isVerified: false,
      };
    }
    return {
      name: user?.name || t('common.user'),
      email: user?.email || '',
      phone: user?.phone || '',
      profileImage: user?.profileImage,
      rating: 0,
      ratingCount: 0,
      experienceYears: 0,
      isVerified: false,
    };
  }, [isDoctor, doctorProfile, userProfile, user, t]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Upcoming':
        return t('more.profile.status.upcoming');
      case 'Completed':
        return t('more.profile.status.completed');
      case 'Cancelled':
        return t('more.profile.status.cancelled');
      case 'Paid':
        return t('more.profile.status.paid');
      case 'Unpaid':
        return t('more.profile.status.unpaid');
      default:
        return status;
    }
  };

  // Normalize image URL
  const profileImageUri = useMemo(() => {
    if (!profileData.profileImage) return null;
    if (profileData.profileImage.startsWith('http://') || profileData.profileImage.startsWith('https://')) {
      return profileData.profileImage;
    }
    const serverBaseUrl = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    const cleanUrl = profileData.profileImage.startsWith('/') ? profileData.profileImage : '/' + profileData.profileImage;
    return `${serverBaseUrl}${cleanUrl}`;
  }, [profileData.profileImage]);

  const getStatusBadge = (status: string) => {
    const colorsMap: { [key: string]: string } = {
      Upcoming: colors.warning,
      Completed: colors.success,
      Cancelled: colors.error,
      Paid: colors.success,
      Unpaid: colors.error,
    };
    return colorsMap[status] || colors.textSecondary;
  };

  const handleViewAppointment = (appointmentId: string) => {
    (navigation as any).navigate('Appointments', { screen: 'AppointmentDetails', params: { appointmentId } });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('more.profile.searchAppointmentsPlaceholder')}
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {appointments
              .filter((apt) =>
                apt.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                apt.id.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  style={styles.itemCard}
                  onPress={() => handleViewAppointment(appointment.id)}
                >
                  <View style={styles.itemHeader}>
                    <Image source={appointment.doctorImg} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemId}>{appointment.id}</Text>
                      <Text style={styles.itemTitle}>{appointment.doctor}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(appointment.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusBadge(appointment.status) }]}>
                        {getStatusLabel(appointment.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('more.profile.labels.apptDate')}</Text>
                      <Text style={styles.detailValue}>{appointment.apptDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('more.profile.labels.bookingDate')}</Text>
                      <Text style={styles.detailValue}>{appointment.bookingDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('more.profile.labels.amount')}</Text>
                      <Text style={styles.detailValue}>{appointment.amount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </>
        );
      case 'prescription':
        return (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('more.profile.searchPrescriptionsPlaceholder')}
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {prescriptions
              .filter((pres) =>
                pres.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pres.id.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((prescription) => (
                <View key={prescription.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Image source={prescription.doctorImg} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemId}>{prescription.id}</Text>
                      <Text style={styles.itemTitle}>{prescription.doctor}</Text>
                      <Text style={styles.itemSubtitle}>{prescription.type}</Text>
                    </View>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.detailValue}>
                      {t('more.profile.labels.dateWithValue', { value: prescription.date })}
                    </Text>
                  </View>
                </View>
              ))}
          </>
        );
      case 'medical':
        return (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('more.profile.searchMedicalRecordsPlaceholder')}
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {medicalRecords
              .filter((record) =>
                record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                record.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((record, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.recordHeader}>
                    <Ionicons name="document-text" size={24} color={colors.primary} />
                    <View style={styles.recordInfo}>
                      <Text style={styles.itemTitle}>{record.name}</Text>
                      <Text style={styles.itemSubtitle}>{record.description}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailValue}>
                    {t('more.profile.labels.dateWithValue', { value: record.date })}
                  </Text>
                </View>
              ))}
          </>
        );
      case 'billing':
        return (
          <>
            {billing.map((bill, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.billingRow}>
                  <View>
                    <Text style={styles.detailLabel}>{t('more.profile.labels.date')}</Text>
                    <Text style={styles.itemTitle}>{bill.date}</Text>
                  </View>
                  <View style={styles.billingAmount}>
                    <Text style={styles.detailLabel}>{t('more.profile.labels.amountNoColon')}</Text>
                    <Text style={styles.amountValue}>{bill.amount}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(bill.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusBadge(bill.status) }]}>
                      {getStatusLabel(bill.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        );
      default:
        return null;
    }
  };

  if (userProfileLoading || doctorProfileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.profile.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.patientHeader}>
        <Image
          source={profileImageUri ? { uri: profileImageUri } : require('../../../assets/avatar.png')}
          style={styles.patientImage}
        />
        <View style={styles.patientInfo}>
          {isDoctor ? (
            <>
              {profileData.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.verifiedText}>{t('more.profile.verified')}</Text>
                </View>
              )}
              <Text style={styles.patientName}>{profileData.name}</Text>
              {profileData.title && <Text style={styles.patientSubtitle}>{profileData.title}</Text>}
              <Text style={styles.patientSpecialization}>{profileData.specialization}</Text>
              <View style={styles.patientMeta}>
                {profileData.rating > 0 && (
                  <>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.metaText}>{profileData.rating.toFixed(1)}</Text>
                      <Text style={styles.metaText}>({profileData.ratingCount})</Text>
                    </View>
                    <Text style={styles.metaSeparator}>•</Text>
                  </>
                )}
                {profileData.experienceYears > 0 && (
                  <Text style={styles.metaText}>
                    {profileData.experienceYears === 1
                      ? t('more.profile.yearExperience', { count: profileData.experienceYears })
                      : t('more.profile.yearsExperience', { count: profileData.experienceYears })}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.patientId}>#{userId?.slice(-4) || '0000'}</Text>
              <Text style={styles.patientName}>{profileData.name}</Text>
              <View style={styles.patientMeta}>
                {profileData.dob && (
                  <Text style={styles.metaText}>
                    {t('more.profile.ageLabel')}{' '}
                    {new Date().getFullYear() - new Date(profileData.dob).getFullYear()}
                  </Text>
                )}
                {profileData.gender && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.metaText}>{profileData.gender}</Text>
                  </>
                )}
                {profileData.bloodGroup && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.metaText}>{profileData.bloodGroup}</Text>
                  </>
                )}
              </View>
            </>
          )}
        </View>
        {!isDoctor && (
          <View style={styles.lastBooking}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.lastBookingLabel}>{t('more.profile.lastBooking')}</Text>
            <Text style={styles.lastBookingDate}>24 Mar 2024</Text>
          </View>
        )}
      </View>

      {/* Tabs - Only show for patients */}
      {!isDoctor && (
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {['appointments', 'prescription', 'medical', 'billing'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'appointments'
                    ? t('more.profile.tabs.appointments')
                    : tab === 'prescription'
                      ? t('more.profile.tabs.prescription')
                      : tab === 'medical'
                        ? t('more.profile.tabs.medical')
                        : t('more.profile.tabs.billing')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {isDoctor ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          <View style={styles.doctorProfileSection}>
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t('more.profile.contactInformation')}</Text>
              {profileData.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{profileData.email}</Text>
                </View>
              )}
              {profileData.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{profileData.phone}</Text>
                </View>
              )}
            </View>

            {profileData.biography && (
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('more.profile.biography')}</Text>
                <Text style={styles.biographyText}>{profileData.biography}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('ProfileSettings')}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.editButtonText}>{t('more.profile.editProfile')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {renderContent()}
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
  patientHeader: {
    backgroundColor: colors.background,
    padding: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientId: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaSeparator: {
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  lastBooking: {
    alignItems: 'flex-end',
  },
  lastBookingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  lastBookingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tabsContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.textWhite,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  itemCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  patientSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientSpecialization: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorProfileSection: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  biographyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 8,
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
