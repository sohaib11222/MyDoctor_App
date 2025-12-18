import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PatientProfileScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;
type PatientProfileRouteProp = RouteProp<HomeStackParamList, 'PatientProfile'>;

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

const mockAppointments: Appointment[] = [
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
    status: 'Completed',
  },
];

const mockPrescriptions: Prescription[] = [
  {
    id: '#Apt123',
    doctor: 'Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
    type: 'Visit',
    date: '25 Jan 2024',
  },
  {
    id: '#Apt124',
    doctor: 'John Homes',
    doctorImg: require('../../../assets/avatar.png'),
    type: 'Visit',
    date: '28 Jan 2024',
  },
];

const mockMedicalRecords: MedicalRecord[] = [
  { name: 'Lab Report', date: '24 Mar 2024', description: 'Glucose Test V12' },
  { name: 'Lab Report', date: '27 Mar 2024', description: 'Complete Blood Count(CBC)' },
  { name: 'Lab Report', date: '10 Apr 2024', description: 'Echocardiogram' },
];

const mockBilling: Billing[] = [
  { date: '24 Mar 2024', amount: '$300', status: 'Paid' },
  { date: '28 Mar 2024', amount: '$350', status: 'Paid' },
  { date: '10 Apr 2024', amount: '$400', status: 'Paid' },
];

export const PatientProfileScreen = () => {
  const navigation = useNavigation<PatientProfileScreenNavigationProp>();
  const route = useRoute<PatientProfileRouteProp>();
  const { patientId } = route.params;
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescription' | 'medical' | 'billing'>('appointments');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock patient data - in real app, fetch based on patientId
  const patient = {
    id: patientId,
    name: 'Adrian Marshall',
    patientId: '#P0016',
    age: 42,
    gender: 'Male',
    bloodGroup: 'AB+ve',
    lastBooking: '24 Mar 2024',
    img: require('../../../assets/avatar.png'),
  };

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

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search appointments..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {mockAppointments.map((apt) => (
              <View key={apt.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Image source={apt.doctorImg} style={styles.doctorAvatar} />
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentId}>{apt.id}</Text>
                    <Text style={styles.doctorName}>{apt.doctor}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(apt.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusBadge(apt.status) }]}>
                      {apt.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Appt Date:</Text>
                    <Text style={styles.detailValue}>{apt.apptDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking Date:</Text>
                    <Text style={styles.detailValue}>{apt.bookingDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>{apt.amount}</Text>
                  </View>
                </View>
              </View>
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
                placeholder="Search prescriptions..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {mockPrescriptions.map((prescription) => (
              <View key={prescription.id} style={styles.prescriptionCard}>
                <Image source={prescription.doctorImg} style={styles.doctorAvatar} />
                <View style={styles.prescriptionInfo}>
                  <Text style={styles.prescriptionId}>{prescription.id}</Text>
                  <Text style={styles.doctorName}>{prescription.doctor}</Text>
                  <View style={styles.prescriptionDetails}>
                    <Text style={styles.prescriptionType}>{prescription.type}</Text>
                    <Text style={styles.prescriptionDate}>{prescription.date}</Text>
                  </View>
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
                placeholder="Search medical records..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {mockMedicalRecords.map((record, index) => (
              <View key={index} style={styles.recordCard}>
                <View style={styles.recordIcon}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{record.name}</Text>
                  <Text style={styles.recordDescription}>{record.description}</Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="download-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        );
      case 'billing':
        return (
          <>
            {mockBilling.map((bill, index) => (
              <View key={index} style={styles.billingCard}>
                <View style={styles.billingInfo}>
                  <Text style={styles.billingDate}>{bill.date}</Text>
                  <Text style={styles.billingAmount}>{bill.amount}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(bill.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusBadge(bill.status) }]}>
                    {bill.status}
                  </Text>
                </View>
              </View>
            ))}
          </>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Patient Info Header */}
      <View style={styles.patientHeader}>
        <Image source={patient.img} style={styles.patientAvatar} />
        <View style={styles.patientInfo}>
          <Text style={styles.patientId}>{patient.patientId}</Text>
          <Text style={styles.patientName}>{patient.name}</Text>
          <View style={styles.patientDetails}>
            <Text style={styles.patientDetail}>Age: {patient.age}</Text>
            <Text style={styles.patientDetail}>•</Text>
            <Text style={styles.patientDetail}>{patient.gender}</Text>
            <Text style={styles.patientDetail}>•</Text>
            <Text style={styles.patientDetail}>{patient.bloodGroup}</Text>
          </View>
        </View>
        <View style={styles.lastBooking}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.lastBookingLabel}>Last Booking</Text>
          <Text style={styles.lastBookingDate}>{patient.lastBooking}</Text>
        </View>
      </View>

      {/* Tabs */}
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  patientDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  patientDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastBooking: {
    alignItems: 'flex-end',
  },
  lastBookingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  lastBookingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
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
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  appointmentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  prescriptionCard: {
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
  prescriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prescriptionId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  prescriptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  prescriptionType: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  prescriptionDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordCard: {
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
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recordDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  billingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  billingInfo: {
    flex: 1,
  },
  billingDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  billingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});

