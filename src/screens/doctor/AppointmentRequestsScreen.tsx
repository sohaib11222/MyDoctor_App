import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type AppointmentRequestsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AppointmentRequests'>;

interface AppointmentRequest {
  id: string;
  patientName: string;
  patientImg: any;
  date: string;
  visitType: string;
  appointmentType: string;
  clinicLocation?: string;
  isNew?: boolean;
}

const mockRequests: AppointmentRequest[] = [
  {
    id: '#Apt0001',
    patientName: 'Adrian',
    patientImg: require('../../../assets/avatar.png'),
    date: '11 Nov 2024 10.45 AM',
    visitType: 'General Visit',
    appointmentType: 'Video Call',
    isNew: true,
  },
  {
    id: '#Apt0002',
    patientName: 'Kelly',
    patientImg: require('../../../assets/avatar.png'),
    date: '10 Nov 2024 02.00 PM',
    visitType: 'General Visit',
    appointmentType: 'Direct Visit',
    clinicLocation: "Sofia's Clinic",
  },
  {
    id: '#Apt0003',
    patientName: 'Samuel',
    patientImg: require('../../../assets/avatar.png'),
    date: '08 Nov 2024 08.30 AM',
    visitType: 'Consultation for Cardio',
    appointmentType: 'Audio Call',
  },
];

export const AppointmentRequestsScreen = () => {
  const navigation = useNavigation<AppointmentRequestsScreenNavigationProp>();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 7 Days');

  const handleAccept = (requestId: string) => {
    Alert.alert('Accept Appointment', 'Are you sure you want to accept this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () => {
          Alert.alert('Success', 'Appointment accepted successfully');
          // Handle accept logic
        },
      },
    ]);
  };

  const handleReject = (requestId: string) => {
    Alert.alert('Reject Appointment', 'Are you sure you want to reject this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Success', 'Appointment rejected');
          // Handle reject logic
        },
      },
    ]);
  };

  const getAppointmentTypeIcon = (type: string) => {
    switch (type) {
      case 'Video Call':
        return { name: 'videocam-outline', color: colors.info };
      case 'Audio Call':
        return { name: 'call-outline', color: colors.primary };
      case 'Direct Visit':
        return { name: 'medical-outline', color: colors.success };
      default:
        return { name: 'chatbubble-outline', color: colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Period Selector */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
        <TouchableOpacity style={styles.periodSelector}>
          <Text style={styles.periodText}>{selectedPeriod}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mockRequests.map((request) => {
          const icon = getAppointmentTypeIcon(request.appointmentType);
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.patientInfo}>
                  <TouchableOpacity
                    onPress={() => (navigation as any).navigate('Home', { screen: 'PatientProfile', params: { patientId: '1' } })}
                  >
                    <Image source={request.patientImg} style={styles.patientImage} />
                  </TouchableOpacity>
                  <View style={styles.patientDetails}>
                    <View style={styles.patientNameRow}>
                      <Text style={styles.patientId}>{request.id}</Text>
                      {request.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => (navigation as any).navigate('Home', { screen: 'PatientProfile', params: { patientId: '1' } })}
                    >
                      <Text style={styles.patientName}>{request.patientName}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.requestInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{request.date}</Text>
                </View>
                <Text style={styles.visitType}>{request.visitType}</Text>
              </View>

              <View style={styles.appointmentTypeSection}>
                <Text style={styles.typeLabel}>Type of Appointment</Text>
                <View style={styles.typeContainer}>
                  <Ionicons name={icon.name as any} size={16} color={icon.color} />
                  <Text style={styles.typeText}>{request.appointmentType}</Text>
                  {request.clinicLocation && (
                    <>
                      <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                      <Text style={styles.clinicText}>{request.clinicLocation}</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(request.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={18} color={colors.textWhite} />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(request.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color={colors.error} />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    gap: 4,
  },
  periodText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
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
  requestHeader: {
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientId: {
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
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  requestInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  visitType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  appointmentTypeSection: {
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  clinicText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 6,
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

