import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MoreStackParamList, TabParamList, HomeStackParamList, AppointmentsStackParamList, ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PatientDashboardScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

const { width } = Dimensions.get('window');

interface HealthRecord {
  icon: string;
  label: string;
  value: string;
  change?: string;
  color: string;
}

interface FavouriteDoctor {
  id: string;
  name: string;
  speciality: string;
  img: any;
}

interface Appointment {
  id: string;
  doctor: string;
  doctorImg: any;
  speciality: string;
  date: string;
  time: string;
  type: 'hospital' | 'video';
}

const healthRecords: HealthRecord[] = [
  { icon: 'heart', label: 'Heart Rate', value: '140 Bpm', change: '2%', color: colors.warning },
  { icon: 'thermometer', label: 'Body Temperature', value: '37.5 C', color: colors.warning },
  { icon: 'document-text', label: 'Glucose Level', value: '70 - 90', change: '6%', color: colors.info },
  { icon: 'pulse', label: 'SPo2', value: '96%', color: colors.primary },
  { icon: 'water', label: 'Blood Pressure', value: '100 mg/dl', change: '2%', color: colors.error },
  { icon: 'body', label: 'BMI', value: '20.1 kg/m2', color: colors.secondary },
];

const favouriteDoctors: FavouriteDoctor[] = [
  { id: '1', name: 'Dr. Edalin', speciality: 'Endodontists', img: require('../../../assets/avatar.png') },
  { id: '2', name: 'Dr. Maloney', speciality: 'Cardiologist', img: require('../../../assets/avatar.png') },
  { id: '3', name: 'Dr. Wayne', speciality: 'Dental Specialist', img: require('../../../assets/avatar.png') },
  { id: '4', name: 'Dr. Marla', speciality: 'Endodontists', img: require('../../../assets/avatar.png') },
];

const upcomingAppointments: Appointment[] = [
  {
    id: '1',
    doctor: 'Dr.Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
    speciality: 'Dentist',
    date: '21 Mar 2024',
    time: '10:30 PM',
    type: 'hospital',
  },
  {
    id: '2',
    doctor: 'Dr.Juliet Gabriel',
    doctorImg: require('../../../assets/avatar.png'),
    speciality: 'Cardiologist',
    date: '25 Mar 2024',
    time: '02:00 PM',
    type: 'video',
  },
];

export const PatientDashboardScreen = () => {
  const navigation = useNavigation<PatientDashboardScreenNavigationProp>();

  const handleBookAppointment = () => {
    (navigation as any).navigate('Home', { screen: 'Search' });
  };

  const handleViewFavourites = () => {
    (navigation as any).navigate('More', { screen: 'Favourites' });
  };

  const handleViewAppointment = (appointmentId: string) => {
    (navigation as any).navigate('Appointments', { screen: 'AppointmentDetails', params: { appointmentId } });
  };

  const handleChat = (doctorId: string) => {
    (navigation as any).navigate('Chat', { screen: 'ChatDetail', params: { chatId: doctorId, recipientName: 'Doctor' } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {favouriteDoctors.map((doctor) => (
              <View key={doctor.id} style={styles.favouriteCard}>
                <Image source={doctor.img} style={styles.favouriteImage} />
                <Text style={styles.favouriteName}>{doctor.name}</Text>
                <Text style={styles.favouriteSpeciality}>{doctor.speciality}</Text>
                <TouchableOpacity
                  style={styles.favouriteBookButton}
                  onPress={() => (navigation as any).navigate('Home', { screen: 'Booking', params: { doctorId: doctor.id } })}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          {upcomingAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Image source={appointment.doctorImg} style={styles.appointmentDoctorImage} />
                <View style={styles.appointmentDoctorInfo}>
                  <Text style={styles.appointmentDoctorName}>{appointment.doctor}</Text>
                  <Text style={styles.appointmentSpeciality}>{appointment.speciality}</Text>
                </View>
                <Ionicons
                  name={appointment.type === 'video' ? 'videocam' : 'medical'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.appointmentDateTime}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.appointmentDateTimeText}>
                  {appointment.date} - {appointment.time}
                </Text>
              </View>
              <View style={styles.appointmentActions}>
                <TouchableOpacity
                  style={styles.appointmentActionButton}
                  onPress={() => handleChat(appointment.id)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={styles.appointmentActionText}>Chat Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.appointmentActionButton, styles.appointmentActionButtonPrimary]}
                  onPress={() => handleViewAppointment(appointment.id)}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.textWhite} />
                  <Text style={[styles.appointmentActionText, styles.appointmentActionTextWhite]}>
                    Attend
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
});

