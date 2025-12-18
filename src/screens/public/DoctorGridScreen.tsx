import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Modal,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type DoctorGridScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'DoctorGrid'>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

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
  colorClass: string;
}

const DoctorGridScreen = () => {
  const navigation = useNavigation<DoctorGridScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAvailability, setShowAvailability] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Urology']);

  const doctors: Doctor[] = [
    { id: 1, name: 'Dr. Michael Brown', specialty: 'Psychologist', rating: 5.0, location: 'Minneapolis, MN', duration: '30 Min', fee: 650, available: true, image: 'https://via.placeholder.com/150', colorClass: 'indigo' },
    { id: 2, name: 'Dr. Nicholas Tello', specialty: 'Pediatrician', rating: 4.6, location: 'Ogden, IA', duration: '60 Min', fee: 400, available: true, image: 'https://via.placeholder.com/150', colorClass: 'pink' },
    { id: 3, name: 'Dr. Harold Bryant', specialty: 'Neurologist', rating: 4.8, location: 'Winona, MS', duration: '30 Min', fee: 500, available: true, image: 'https://via.placeholder.com/150', colorClass: 'teal' },
    { id: 4, name: 'Dr. Sandra Jones', specialty: 'Cardiologist', rating: 4.8, location: 'Beckley, WV', duration: '30 Min', fee: 550, available: true, image: 'https://via.placeholder.com/150', colorClass: 'info' },
    { id: 5, name: 'Dr. Charles Scott', specialty: 'Neurologist', rating: 4.2, location: 'Hamshire, TX', duration: '30 Min', fee: 600, available: true, image: 'https://via.placeholder.com/150', colorClass: 'teal' },
    { id: 6, name: 'Dr. Robert Thomas', specialty: 'Cardiologist', rating: 4.2, location: 'Oakland, CA', duration: '30 Min', fee: 450, available: true, image: 'https://via.placeholder.com/150', colorClass: 'info' },
  ];

  const specialties = ['Urology', 'Psychiatry', 'Cardiology', 'Pediatrics', 'Neurology'];

  const getColorForSpecialty = (colorClass: string) => {
    const colorMap: { [key: string]: string } = {
      indigo: '#6366F1',
      pink: '#EC4899',
      teal: '#14B8A6',
      info: '#3B82F6',
      danger: '#EF4444',
    };
    return colorMap[colorClass] || colors.primary;
  };

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const renderDoctorCard = ({ item, index }: { item: Doctor; index: number }) => (
    <TouchableOpacity
      style={[styles.doctorCard, { width: cardWidth, marginLeft: index % 2 === 0 ? 0 : 8 }]}
      onPress={() => navigation.navigate('DoctorProfile', { doctorId: item.id.toString() })}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.doctorImage} />
        <View style={styles.overlay}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFB800" />
            <Text style={styles.ratingBadgeText}>{item.rating}</Text>
          </View>
          <TouchableOpacity style={styles.favIcon} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={14} color={colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.cardHeader, { borderLeftColor: getColorForSpecialty(item.colorClass) }]}>
        <Text style={[styles.specialtyText, { color: getColorForSpecialty(item.colorClass) }]} numberOfLines={1}>
          {item.specialty}
        </Text>
        <View style={[styles.availabilityBadge, item.available ? styles.availableBadge : styles.unavailableBadge]}>
          <View style={[styles.availabilityDot, item.available ? styles.availableDot : styles.unavailableDot]} />
          <Text style={[styles.availabilityText, item.available ? styles.availableText : styles.unavailableText]} numberOfLines={1}>
            {item.available ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.doctorName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Fee</Text>
          <Text style={styles.feeAmount}>${item.fee}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('Booking', { doctorId: item.id.toString() });
          }}
        >
          <Ionicons name="calendar-outline" size={12} color={colors.textWhite} />
          <Text style={styles.bookBtnText}>Book</Text>
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
              placeholder="Search for Doctors"
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
          <Text style={styles.resultsCount}>450</Text> Doctors
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
            <TouchableOpacity style={[styles.viewBtn, styles.viewBtnActive]} activeOpacity={0.7}>
              <Ionicons name="grid" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={18} color={colors.textSecondary} />
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

      {/* Grid List */}
      <FlatList
        data={doctors}
        renderItem={renderDoctorCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
                <Text style={styles.applyBtnText}>Apply</Text>
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
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  doctorCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  doctorImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  favIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderLeftWidth: 3,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  availableBadge: {
    backgroundColor: '#D1FAE5',
  },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
  },
  availabilityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 3,
  },
  availableDot: {
    backgroundColor: colors.success,
  },
  unavailableDot: {
    backgroundColor: colors.error,
  },
  availabilityText: {
    fontSize: 9,
    fontWeight: '500',
  },
  availableText: {
    color: colors.success,
  },
  unavailableText: {
    color: colors.error,
  },
  cardBody: {
    padding: 10,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  feeContainer: {
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  bookBtnText: {
    color: colors.textWhite,
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginHorizontal: 16,
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

export default DoctorGridScreen;
