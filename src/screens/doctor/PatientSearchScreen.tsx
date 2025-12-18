import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PatientSearchScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

interface Patient {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: string;
  bloodGroup: string;
  lastAppointment: string;
  location: string;
  img: any;
}

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Adrian Marshall',
    patientId: 'P0001',
    age: 42,
    gender: 'Male',
    bloodGroup: 'AB+',
    lastAppointment: '15 Mar 2024',
    location: 'Alabama, USA',
    img: require('../../../assets/avatar.png'),
  },
  {
    id: '2',
    name: 'Kelly Stevens',
    patientId: 'P0002',
    age: 35,
    gender: 'Female',
    bloodGroup: 'O+',
    lastAppointment: '13 Mar 2024',
    location: 'New York, USA',
    img: require('../../../assets/avatar.png'),
  },
  {
    id: '3',
    name: 'Samuel Anderson',
    patientId: 'P0003',
    age: 28,
    gender: 'Male',
    bloodGroup: 'A+',
    lastAppointment: '10 Mar 2024',
    location: 'California, USA',
    img: require('../../../assets/avatar.png'),
  },
  {
    id: '4',
    name: 'Catherine Griffin',
    patientId: 'P0004',
    age: 45,
    gender: 'Female',
    bloodGroup: 'B+',
    lastAppointment: '08 Mar 2024',
    location: 'Texas, USA',
    img: require('../../../assets/avatar.png'),
  },
];

export const PatientSearchScreen = () => {
  const navigation = useNavigation<PatientSearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState(mockPatients);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPatients(mockPatients);
    } else {
      const filtered = mockPatients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query.toLowerCase()) ||
          patient.patientId.toLowerCase().includes(query.toLowerCase()) ||
          patient.location.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name, ID, or location..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySubtext}>Try searching with a different keyword</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'} found
            </Text>
            {filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => navigation.navigate('PatientProfile', { patientId: patient.id })}
              >
                <Image source={patient.img} style={styles.patientAvatar} />
                <View style={styles.patientInfo}>
                  <View style={styles.patientHeader}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientId}>#{patient.patientId}</Text>
                  </View>
                  <View style={styles.patientDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>
                        {patient.age} years • {patient.gender}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="water-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Blood Group: {patient.bloodGroup}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{patient.location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Last Appointment: {patient.lastAppointment}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  patientCard: {
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
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  patientDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

