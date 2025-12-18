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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type MedicalRecordsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface Prescription {
  id: string;
  name: string;
  date: string;
  doctor: string;
  doctorImg: any;
}

interface MedicalRecord {
  id: string;
  name: string;
  date: string;
  patient: string;
  patientImg: any;
  comments: string;
}

const prescriptions: Prescription[] = [
  {
    id: '#P1236',
    name: 'Prescription',
    date: '24 Mar 2024, 10:30 AM',
    doctor: 'Edalin Hendry',
    doctorImg: require('../../../assets/avatar.png'),
  },
  {
    id: '#P3656',
    name: 'Prescription',
    date: '27 Mar 2024, 11:15 AM',
    doctor: 'John Homes',
    doctorImg: require('../../../assets/avatar.png'),
  },
  {
    id: '#P1246',
    name: 'Prescription',
    date: '11 Apr 2024, 09:00 AM',
    doctor: 'Shanta Neill',
    doctorImg: require('../../../assets/avatar.png'),
  },
];

const medicalRecords: MedicalRecord[] = [
  {
    id: '#MR1236',
    name: 'Electro cardiography',
    date: '24 Mar 2024',
    patient: 'Hendrita Clark',
    patientImg: require('../../../assets/avatar.png'),
    comments: 'Take Good Rest',
  },
  {
    id: '#MR3656',
    name: 'Complete Blood Count',
    date: '27 Mar 2024',
    patient: 'Laura Stewart',
    patientImg: require('../../../assets/avatar.png'),
    comments: 'Stable, no change',
  },
  {
    id: '#MR1246',
    name: 'Blood Glucose Test',
    date: '10 Apr 2024',
    patient: 'Mathew Charles',
    patientImg: require('../../../assets/avatar.png'),
    comments: 'All Clear',
  },
];

export const MedicalRecordsScreen = () => {
  const navigation = useNavigation<MedicalRecordsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'medical' | 'prescription'>('medical');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrescriptions = prescriptions.filter((prescription) =>
    prescription.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prescription.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMedicalRecords = medicalRecords.filter((record) =>
    record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPrescription = (id: string) => {
    // Navigate to view prescription
  };

  const handleViewRecord = (id: string) => {
    // Navigate to view medical record
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medical' && styles.activeTab]}
          onPress={() => setActiveTab('medical')}
        >
          <Text style={[styles.tabText, activeTab === 'medical' && styles.activeTabText]}>
            Medical Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescription' && styles.activeTab]}
          onPress={() => setActiveTab('prescription')}
        >
          <Text style={[styles.tabText, activeTab === 'prescription' && styles.activeTabText]}>
            Prescriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'prescription' ? (
          // Prescriptions List
          filteredPrescriptions.map((prescription) => (
            <View key={prescription.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordIcon}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordId}>{prescription.id}</Text>
                  <Text style={styles.recordName}>{prescription.name}</Text>
                  <Text style={styles.recordDate}>{prescription.date}</Text>
                </View>
              </View>
              <View style={styles.doctorInfo}>
                <Image source={prescription.doctorImg} style={styles.doctorImage} />
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorLabel}>Prescribed By</Text>
                  <Text style={styles.doctorName}>{prescription.doctor}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewPrescription(prescription.id)}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          // Medical Records List
          filteredMedicalRecords.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordIcon}>
                  <Ionicons name="medical" size={24} color={colors.primary} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordId}>{record.id}</Text>
                  <Text style={styles.recordName}>{record.name}</Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
              </View>
              <View style={styles.patientInfo}>
                <Image source={record.patientImg} style={styles.patientImage} />
                <View style={styles.patientDetails}>
                  <Text style={styles.patientLabel}>Patient</Text>
                  <Text style={styles.patientName}>{record.patient}</Text>
                </View>
              </View>
              <View style={styles.commentsContainer}>
                <Text style={styles.commentsLabel}>Comments:</Text>
                <Text style={styles.commentsText}>{record.comments}</Text>
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewRecord(record.id)}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
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
  recordCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  doctorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  patientImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 12,
  },
  commentsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 14,
    color: colors.text,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

