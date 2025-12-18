import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type AppointmentDetailsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentDetails'>;
type AppointmentDetailsRouteProp = RouteProp<AppointmentsStackParamList, 'AppointmentDetails'>;

const AppointmentDetailsScreen = () => {
  const navigation = useNavigation<AppointmentDetailsScreenNavigationProp>();
  const route = useRoute<AppointmentDetailsRouteProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const { appointmentId } = route.params;
  const [status] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  // Mock appointment data - different for doctor vs patient
  const appointment = isDoctor ? {
    id: appointmentId,
    patient: 'Kelly Joseph',
    patientImg: require('../../../assets/avatar.png'),
    email: 'kelly@example.com',
    phone: '+1 504 368 6874',
    date: '22 Jul 2023 - 12:00 pm',
    clinic: "Adrian's Dentistry",
    location: 'Newyork, United States',
    visitType: 'General',
    appointmentType: 'Direct Visit',
    fee: 200,
    personWithPatient: 'Andrew (45)',
  } : {
    id: appointmentId,
    doctor: 'Dr Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
    email: 'edalin@example.com',
    phone: '+1 504 368 6874',
    date: '22 Jul 2023 - 12:00 pm',
    clinic: "Adrian's Dentistry",
    location: 'Newyork, United States',
    visitType: 'General',
    appointmentType: 'Direct Visit',
    fee: 200,
    personWithPatient: 'Andrew',
  };

  const recentAppointments = [
    { id: '#Apt0002', doctor: isDoctor ? 'Kelly Stevens' : 'Dr.Shanta Nesmith', doctorImg: require('../../../assets/avatar.png'), date: '11 Nov 2024 10.45 AM', types: ['General Visit', 'Chat'], email: 'shanta@example.com', phone: '+1 504 368 6874' },
    { id: '#Apt0003', doctor: isDoctor ? 'Samuel Anderson' : 'Dr.John Ewel', doctorImg: require('../../../assets/avatar.png'), date: '27 Oct 2024 09.30 AM', types: ['General Visit', 'Video Call'], email: 'john@example.com', phone: '+1 749 104 6291' },
  ];

  const getStatusBadge = () => {
    switch (status) {
      case 'upcoming':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Upcoming' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
      default:
        return { bg: colors.backgroundLight, text: colors.text, label: 'Unknown' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appointment Detail Card */}
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.doctorInfo}>
              <Image 
                source={isDoctor ? appointment.patientImg : appointment.doctorImg} 
                style={styles.doctorImage} 
              />
              <View style={styles.doctorDetails}>
                <Text style={styles.appointmentId}>{appointment.id}</Text>
                <Text style={styles.doctorName}>
                  {isDoctor ? appointment.patient : appointment.doctor}
                </Text>
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.contactText}>{appointment.email}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.contactText}>{appointment.phone}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.appointmentActions}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>
              <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Consultation Fees</Text>
                <Text style={styles.feeAmount}>${appointment.fee}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {status === 'upcoming' && (
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.appointmentTypeSection}>
            <Text style={styles.sectionLabel}>Type of Appointment</Text>
            <View style={styles.typeBadge}>
              <Ionicons name="medical-outline" size={16} color={colors.success} />
              <Text style={styles.typeText}>{appointment.appointmentType}</Text>
            </View>
          </View>

          {isDoctor && appointment.personWithPatient && (
            <View style={styles.personSection}>
              <Text style={styles.sectionLabel}>Person with patient</Text>
              <View style={styles.personBadge}>
                <Text style={styles.personText}>{appointment.personWithPatient}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Appointment Date & Time</Text>
              <Text style={styles.detailValue}>{appointment.date}</Text>
            </View>
            {status === 'upcoming' && (
              <>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Clinic Location</Text>
                  <Text style={styles.detailValue}>{appointment.clinic}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{appointment.location}</Text>
                </View>
              </>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Visit Type</Text>
              <Text style={styles.detailValue}>{appointment.visitType}</Text>
            </View>
          </View>

          {status === 'upcoming' && isDoctor && (
            <TouchableOpacity 
              style={styles.startSessionBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StartAppointment', { appointmentId: appointment.id })}
            >
              <Text style={styles.startSessionText}>Start Session</Text>
            </TouchableOpacity>
          )}
          {status === 'upcoming' && !isDoctor && (
            <TouchableOpacity style={styles.startSessionBtn} activeOpacity={0.8}>
              <Text style={styles.startSessionText}>View Details</Text>
            </TouchableOpacity>
          )}

          {status === 'completed' && (
            <View style={styles.completedActions}>
              <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={18} color={colors.text} />
                <Text style={styles.downloadBtnText}>Download Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.8}>
                <Text style={styles.rescheduleBtnText}>Reschedule Appointment</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'cancelled' && (
            <View style={styles.cancelledActions}>
              <TouchableOpacity style={styles.reasonBtn} activeOpacity={0.7}>
                <Text style={styles.reasonBtnText}>Reason</Text>
              </TouchableOpacity>
              <View style={styles.rescheduleContainer}>
                <View style={styles.rescheduleBadge}>
                  <Text style={styles.rescheduleBadgeText}>Status : Reschedule</Text>
                </View>
                <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.8}>
                  <Text style={styles.rescheduleBtnText}>Reschedule Appointment</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Recent Appointments */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Appointments</Text>
          {recentAppointments.map((apt) => (
            <TouchableOpacity
              key={apt.id}
              style={styles.recentCard}
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: apt.id })}
              activeOpacity={0.7}
            >
              <Image source={apt.doctorImg} style={styles.recentImage} />
              <View style={styles.recentInfo}>
                <Text style={styles.recentId}>{apt.id}</Text>
                <Text style={styles.recentDoctor}>{apt.doctor}</Text>
                <View style={styles.recentDate}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.recentDateText}>{apt.date}</Text>
                </View>
                <View style={styles.recentTypes}>
                  {apt.types.map((type, idx) => (
                    <View key={idx} style={styles.recentTypeBadge}>
                      <Text style={styles.recentTypeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.recentViewBtn}
                onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: apt.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
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
  appointmentCard: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  doctorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    marginTop: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  appointmentActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feeContainer: {
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
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
  appointmentTypeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  personSection: {
    marginBottom: 16,
  },
  personBadge: {
    backgroundColor: colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  personText: {
    fontSize: 14,
    color: colors.text,
  },
  detailsSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  startSessionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  startSessionText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  completedActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  rescheduleBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rescheduleBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelledActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonBtn: {
    marginBottom: 12,
  },
  reasonBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  rescheduleContainer: {
    gap: 8,
  },
  rescheduleBadge: {
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rescheduleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  recentCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recentDoctor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  recentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentDateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  recentTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentTypeBadge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recentTypeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recentViewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});

export default AppointmentDetailsScreen;
