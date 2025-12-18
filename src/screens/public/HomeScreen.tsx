import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');

const specialities = [
  { id: 1, name: 'Cardiology', doctors: 254, icon: '❤️' },
  { id: 2, name: 'Orthopedics', doctors: 151, icon: '🦴' },
  { id: 3, name: 'Neurology', doctors: 176, icon: '🧠' },
  { id: 4, name: 'Pediatrics', doctors: 124, icon: '👶' },
  { id: 5, name: 'Psychiatry', doctors: 112, icon: '🧘' },
  { id: 6, name: 'Endocrinology', doctors: 104, icon: '⚕️' },
];

const doctors = [
  {
    id: 1,
    name: 'Dr. Michael Brown',
    specialty: 'Psychologist',
    location: 'Minneapolis, MN',
    fee: '$650',
    rating: 5.0,
    available: true,
  },
  {
    id: 2,
    name: 'Dr. Nicholas Tello',
    specialty: 'Pediatrician',
    location: 'Ogden, IA',
    fee: '$400',
    rating: 4.6,
    available: true,
  },
  {
    id: 3,
    name: 'Dr. Harold Bryant',
    specialty: 'Neurologist',
    location: 'Winona, MS',
    fee: '$500',
    rating: 4.8,
    available: true,
  },
];

const patients = [
  {
    id: '1',
    name: 'Adrian Marshall',
    patientId: 'P0001',
    age: 42,
    gender: 'Male',
    lastAppointment: '15 Mar 2024',
    img: require('../../../assets/avatar.png'),
  },
  {
    id: '2',
    name: 'Kelly Stevens',
    patientId: 'P0002',
    age: 35,
    gender: 'Female',
    lastAppointment: '13 Mar 2024',
    img: require('../../../assets/avatar.png'),
  },
  {
    id: '3',
    name: 'Samuel Anderson',
    patientId: 'P0003',
    age: 28,
    gender: 'Male',
    lastAppointment: '10 Mar 2024',
    img: require('../../../assets/avatar.png'),
  },
];

export const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  // Doctor Home Screen
  if (isDoctor) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Hello, Dr. {user?.name?.split(' ')[0] || 'Doctor'}</Text>
            <Text style={styles.title}>My Patients</Text>
            <Text style={styles.subtitle}>Manage your patients and appointments</Text>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('PatientSearch')}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.searchPlaceholder}>Search patients...</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>978</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>50</Text>
            <Text style={styles.statLabel}>Today</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>80</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </Card>
        </View>

        {/* Recent Patients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Patients</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('More', { screen: 'MyPatients' })}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => (navigation as any).navigate('PatientProfile', { patientId: patient.id })}
            >
              <Image source={patient.img} style={styles.patientAvatar} />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientId}>ID: {patient.patientId}</Text>
                <Text style={styles.patientDetails}>
                  {patient.age} years • {patient.gender}
                </Text>
                <Text style={styles.lastAppointment}>Last Appointment: {patient.lastAppointment}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Patient Home Screen (existing)
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.title}>Find Your Doctor</Text>
          <Text style={styles.subtitle}>Book appointments easily and quickly</Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder}>Search doctors, specialities...</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Button
          title="Book Appointment"
          onPress={() => navigation.navigate('Search')}
          style={styles.primaryButton}
        />
        <Button
          title="Find Doctor"
          onPress={() => navigation.navigate('Search')}
          variant="outline"
          style={styles.secondaryButton}
        />
      </View>

      {/* Specialities Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specialities</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specialitiesScroll}
        >
          {specialities.map((speciality) => (
            <TouchableOpacity
              key={speciality.id}
              style={styles.specialityCard}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.specialityIcon}>{speciality.icon}</Text>
              <Text style={styles.specialityName}>{speciality.name}</Text>
              <Text style={styles.specialityCount}>{speciality.doctors} Doctors</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Doctors Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Doctors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.doctorsScroll}
        >
          {doctors.map((doctor) => (
            <Card key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorHeader}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>
                    {doctor.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                {doctor.available && (
                  <View style={styles.availableBadge}>
                    <Text style={styles.availableText}>Available</Text>
                  </View>
                )}
              </View>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorLocation}>📍 {doctor.location}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>⭐ {doctor.rating}</Text>
                </View>
              </View>
              <View style={styles.doctorFooter}>
                <Text style={styles.doctorFee}>{doctor.fee}</Text>
                <Button
                  title="Book"
                  onPress={() => navigation.navigate('DoctorProfile', { doctorId: doctor.id.toString() })}
                  size="small"
                  style={styles.bookButton}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>

      {/* Why Choose Us Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Choose Us</Text>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>🏥</Text>
          <Text style={styles.featureTitle}>Qualified Doctors</Text>
          <Text style={styles.featureDescription}>
            Our team consists of highly qualified and experienced medical professionals.
          </Text>
        </Card>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>⏰</Text>
          <Text style={styles.featureTitle}>24/7 Availability</Text>
          <Text style={styles.featureDescription}>
            Book appointments anytime, anywhere with our easy-to-use platform.
          </Text>
        </Card>
        <Card style={styles.featureCard}>
          <Text style={styles.featureIcon}>💬</Text>
          <Text style={styles.featureTitle}>Easy Communication</Text>
          <Text style={styles.featureDescription}>
            Chat with your doctor directly through our secure messaging system.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: colors.textWhite,
    opacity: 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textWhite,
    opacity: 0.9,
    marginTop: 8,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  searchBar: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: colors.textLight,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  specialitiesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  specialityCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialityIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  specialityName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  specialityCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  doctorsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  doctorCard: {
    width: width * 0.75,
    marginRight: 16,
    padding: 16,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  availableBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableText: {
    fontSize: 10,
    color: colors.textWhite,
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  doctorInfo: {
    marginBottom: 12,
  },
  doctorLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  doctorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  doctorFee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featureCard: {
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Doctor-specific styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  lastAppointment: {
    fontSize: 12,
    color: colors.textLight,
  },
});

