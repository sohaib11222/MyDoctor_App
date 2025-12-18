import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  FlatList,
  Image,
  Dimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type SearchScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Search'>;

const { width } = Dimensions.get('window');

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  duration: string;
  fee: number;
  available: boolean;
  image: string;
}

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [showAvailability, setShowAvailability] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Urology']);
  const [showFilters, setShowFilters] = useState(false);

  const doctors: Doctor[] = [
    { id: 1, name: 'Dr. Michael Brown', specialty: 'Psychologist', rating: 5.0, location: 'Minneapolis, MN', duration: '30 Min', fee: 650, available: true, image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Dr. Nicholas Tello', specialty: 'Pediatrician', rating: 4.6, location: 'Ogden, IA', duration: '60 Min', fee: 400, available: true, image: 'https://via.placeholder.com/150' },
    { id: 3, name: 'Dr. Harold Bryant', specialty: 'Neurologist', rating: 4.8, location: 'Winona, MS', duration: '30 Min', fee: 500, available: true, image: 'https://via.placeholder.com/150' },
    { id: 4, name: 'Dr. Sandra Jones', specialty: 'Cardiologist', rating: 4.8, location: 'Beckley, WV', duration: '30 Min', fee: 550, available: true, image: 'https://via.placeholder.com/150' },
    { id: 5, name: 'Dr. Charles Scott', specialty: 'Neurologist', rating: 4.2, location: 'Hamshire, TX', duration: '30 Min', fee: 600, available: true, image: 'https://via.placeholder.com/150' },
    { id: 6, name: 'Dr. Robert Thomas', specialty: 'Cardiologist', rating: 4.2, location: 'Oakland, CA', duration: '30 Min', fee: 450, available: true, image: 'https://via.placeholder.com/150' },
  ];

  const specialties = ['Urology', 'Psychiatry', 'Cardiology', 'Pediatrics', 'Neurology'];

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color="#FFB800" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={14} color="#FFB800" />);
      }
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const renderDoctorCard = ({ item }: { item: Doctor }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorProfile', { doctorId: item.id.toString() })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.doctorImage} />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.doctorSpecialty} numberOfLines={1}>{item.specialty}</Text>
        <View style={styles.ratingContainer}>
          {renderStars(item.rating)}
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewCount}>(35)</Text>
        </View>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeAmount}>${item.fee}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Booking', { doctorId: item.id.toString() })}
        >
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const ListFooter = () => (
    <TouchableOpacity style={styles.loadMoreBtn} activeOpacity={0.8}>
      <Ionicons name="cube-outline" size={20} color={colors.textWhite} />
      <Text style={styles.loadMoreText}>Load More</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="medical-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for Doctors, Hospitals, Clinics"
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.searchRow}>
            <View style={[styles.searchInputContainer, styles.searchInputSmall]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Location"
                placeholderTextColor={colors.textLight}
                value={location}
                onChangeText={setLocation}
              />
            </View>
            <View style={[styles.searchInputContainer, styles.searchInputSmall]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Date"
                placeholderTextColor={colors.textLight}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color={colors.textWhite} />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          Showing <Text style={styles.resultsCount}>450</Text> Doctors
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.viewControls}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('DoctorGrid')}
              activeOpacity={0.7}
            >
              <Ionicons name="grid" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewBtn, styles.viewBtnActive]} activeOpacity={0.7}>
              <Ionicons name="list" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('MapView')}
              activeOpacity={0.7}
            >
              <Ionicons name="map" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Results List */}
      <FlatList
        data={doctors}
        renderItem={renderDoctorCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={ListFooter}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[]}
              renderItem={() => null}
              ListHeaderComponent={
                <>
                  <View style={styles.filterSection}>
                    <View style={styles.filterSectionHeader}>
                      <Text style={styles.filterSectionTitle}>Availability</Text>
                      <Switch
                        value={showAvailability}
                        onValueChange={setShowAvailability}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.textWhite}
                      />
                    </View>
                  </View>
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Specialities</Text>
                    {specialties.map((spec, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.specialtyItem}
                        onPress={() => toggleSpecialty(spec)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.checkboxContainer}>
                          <View style={[
                            styles.checkbox,
                            selectedSpecialties.includes(spec) && styles.checkboxChecked
                          ]}>
                            {selectedSpecialties.includes(spec) && (
                              <Ionicons name="checkmark" size={12} color={colors.textWhite} />
                            )}
                          </View>
                          <Text style={styles.specialtyText}>{spec}</Text>
                        </View>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>21</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              }
              contentContainerStyle={styles.modalBody}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setSelectedSpecialties([])}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  searchContainer: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInputSmall: {
    flex: 1,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  searchRow: {
    flexDirection: 'row',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  searchBtnText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  resultsCount: {
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtn: {
    padding: 8,
    marginRight: 8,
  },
  viewControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBtn: {
    padding: 8,
    marginLeft: 4,
  },
  viewBtnActive: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  doctorCard: {
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
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  feeContainer: {
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  bookBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  bookBtnText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 13,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  loadMoreText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  specialtyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specialtyText: {
    fontSize: 14,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

export default SearchScreen;
