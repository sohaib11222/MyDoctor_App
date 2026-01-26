import React, { useState, useMemo } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as doctorApi from '../../services/doctor';
import * as specializationApi from '../../services/specialization';
import * as favoriteApi from '../../services/favorite';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';

type SearchScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Search'>;

const { width } = Dimensions.get('window');

const defaultAvatar = require('../../../assets/avatar.png');

/**
 * Normalize image URL for mobile app
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.1.11';
  }
  
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const isPatient = user?.role === 'patient';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [showAvailability, setShowAvailability] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 12;

  // Build query params
  const queryParams = useMemo(() => {
    const params: doctorApi.ListDoctorsParams = {
      page,
      limit,
    };

    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    if (location.trim()) {
      params.city = location.trim();
    }

    if (selectedSpecialization) {
      params.specializationId = selectedSpecialization;
    }

    if (showAvailability) {
      params.isAvailableOnline = true;
    }

    return params;
  }, [searchQuery, location, selectedSpecialization, showAvailability, page, limit]);

  // Fetch doctors
  const { data: doctorsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['doctors', queryParams],
    queryFn: () => doctorApi.listDoctors(queryParams),
    retry: 1,
  });

  // Fetch specializations
  const { data: specializationsResponse } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => specializationApi.getAllSpecializations(),
    retry: 1,
  });

  // Fetch user's favorites
  const { data: favoritesResponse } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => favoriteApi.listFavorites(userId!, { limit: 1000 }),
    enabled: isPatient && !!userId,
    retry: 1,
  });

  // Extract data
  const doctors = useMemo(() => {
    if (!doctorsResponse?.data) return [];
    return doctorsResponse.data.doctors || [];
  }, [doctorsResponse]);

  const specializations = useMemo(() => {
    if (!specializationsResponse) return [];
    // Handle different response structures
    if (Array.isArray(specializationsResponse)) {
      return specializationsResponse;
    }
    const responseData = (specializationsResponse as any)?.data || specializationsResponse;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    return (responseData as any)?.data || [];
  }, [specializationsResponse]);

  const pagination = useMemo(() => {
    if (!doctorsResponse?.data?.pagination) {
      return { page: 1, limit: 12, total: 0, pages: 0 };
    }
    return doctorsResponse.data.pagination;
  }, [doctorsResponse]);

  // Extract favorite doctor IDs
  const favoriteDoctorIds = useMemo(() => {
    if (!favoritesResponse?.data?.favorites) return new Set<string>();
    const favorites = favoritesResponse.data.favorites;
    return new Set(
      favorites
        .map((fav) => {
          // Check if fav or fav.doctorId is null/undefined
          if (!fav || !fav.doctorId || fav.doctorId === null) {
            return null;
          }
          // Check if it's an object (but not null, which typeof also returns 'object')
          const isObject = typeof fav.doctorId === 'object' && fav.doctorId !== null;
          const doctorId = isObject 
            ? (fav.doctorId as any)._id || fav.doctorId 
            : fav.doctorId;
          // Ensure doctorId is not null/undefined
          if (!doctorId || doctorId === null) {
            return null;
          }
          return String(doctorId);
        })
        .filter((id): id is string => id !== null && id !== undefined) // Filter out null/undefined values
    );
  }, [favoritesResponse]);

  // Create favorite ID map for easy removal
  const favoriteIdMap = useMemo(() => {
    if (!favoritesResponse?.data?.favorites) return {};
    const favorites = favoritesResponse.data.favorites;
    const map: Record<string, string> = {};
    favorites.forEach((fav) => {
      // Check if fav or fav.doctorId is null/undefined
      if (!fav || !fav.doctorId || fav.doctorId === null) {
        return; // Skip this favorite
      }
      // Check if it's an object (but not null, which typeof also returns 'object')
      const isObject = typeof fav.doctorId === 'object' && fav.doctorId !== null;
      const doctorId = isObject 
        ? (fav.doctorId as any)._id || fav.doctorId 
        : fav.doctorId;
      // Ensure doctorId is not null/undefined and fav._id exists
      if (doctorId && doctorId !== null && fav._id) {
        map[String(doctorId)] = fav._id;
      }
    });
    return map;
  }, [favoritesResponse]);

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: ({ doctorId }: { doctorId: string }) => 
      favoriteApi.addFavorite(doctorId, userId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Doctor added to favorites',
      });
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add favorite';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId: string) => favoriteApi.removeFavorite(favoriteId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Doctor removed from favorites',
      });
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to remove favorite';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Handle favorite toggle
  const handleFavoriteToggle = (doctorId: string) => {
    if (!isPatient) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login as a patient to add favorites',
      });
      return;
    }

    const doctorIdStr = String(doctorId);
    const isFavorited = favoriteDoctorIds.has(doctorIdStr);

    if (isFavorited) {
      const favoriteId = favoriteIdMap[doctorIdStr];
      if (favoriteId) {
        removeFavoriteMutation.mutate(favoriteId);
      }
    } else {
      addFavoriteMutation.mutate({ doctorId: doctorIdStr });
    }
  };

  // Helper functions
  const getSpecialtyName = (doctor: doctorApi.DoctorListItem): string => {
    // Check doctor.specialization first (direct, matching web format), then nested paths
    if (doctor.specialization) {
      // specialization can be an object (populated) or just an ID
      if (typeof doctor.specialization === 'object' && doctor.specialization !== null && doctor.specialization.name) {
        return doctor.specialization.name;
      }
    }
    // Fallback to nested paths
    if (doctor.doctorProfile?.specialization) {
      const spec = doctor.doctorProfile.specialization;
      return typeof spec === 'object' && spec !== null && spec.name ? spec.name : 'General';
    }
    if (doctor.doctorProfile?.specializations?.[0]) {
      return doctor.doctorProfile.specializations[0].name || 'General';
    }
    return 'General';
  };

  const getRating = (doctor: doctorApi.DoctorListItem): number => {
    // Check multiple possible paths for rating (matching web format)
    return doctor.ratingAvg || 
           doctor.doctorProfile?.ratingAvg || 
           doctor.rating?.average || 
           doctor.doctorProfile?.rating?.average || 
           0;
  };

  const getLocation = (doctor: doctorApi.DoctorListItem): string => {
    // Check both doctor.clinics (direct) and doctor.doctorProfile.clinics (nested)
    const clinics = doctor.clinics || doctor.doctorProfile?.clinics;
    if (clinics && clinics.length > 0) {
      const clinic = clinics[0];
      // Build location string from available fields (matching web format)
      const locationParts = [];
      
      // Add address if available
      if (clinic.address) {
        locationParts.push(clinic.address);
      }
      
      // Add city if available
      if (clinic.city) {
        locationParts.push(clinic.city);
      }
      
      // Add state if available
      if (clinic.state) {
        locationParts.push(clinic.state);
      }
      
      // Add country if available
      if (clinic.country) {
        locationParts.push(clinic.country);
      }
      
      if (locationParts.length > 0) {
        return locationParts.join(', ');
      }
    }
    return 'Location not available';
  };

  const getConsultationFee = (doctor: doctorApi.DoctorListItem): number => {
    // Check both doctor.consultationFees (direct) and doctor.doctorProfile.consultationFees (nested)
    const consultationFees = doctor.consultationFees || doctor.doctorProfile?.consultationFees;
    if (consultationFees) {
      // Prefer online fee, fallback to clinic fee (matching web format)
      if (consultationFees.online) {
        return consultationFees.online;
      } else if (consultationFees.clinic) {
        return consultationFees.clinic;
      }
    }
    // Fallback to single consultationFee field
    if (doctor.doctorProfile?.consultationFee) {
      return doctor.doctorProfile.consultationFee;
    }
    return 0;
  };

  const isDoctorAvailable = (doctor: doctorApi.DoctorListItem): boolean => {
    // Check isAvailableOnline from doctor profile (defaults to true if not set) - matching web format
    if (doctor.isAvailableOnline !== undefined) {
      return doctor.isAvailableOnline;
    }
    // Default to true if field is not present (matching web behavior)
    return true;
  };

  const getDoctorImage = (doctor: doctorApi.DoctorListItem): string | null => {
    return doctor.userId?.profileImage || 
           doctor.profileImage || 
           doctor.doctorProfile?.profileImage || 
           null;
  };

  const getDoctorId = (doctor: doctorApi.DoctorListItem): string => {
    return doctor.userId?._id || doctor._id;
  };

  const getDoctorName = (doctor: doctorApi.DoctorListItem): string => {
    return doctor.userId?.fullName || doctor.fullName || 'Unknown Doctor';
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSearch = () => {
    setPage(1); // Reset to first page on new search
  };

  const handleLoadMore = () => {
    if (page < pagination.pages) {
      setPage(page + 1);
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

  const renderDoctorCard = ({ item }: { item: doctorApi.DoctorListItem }) => {
    const doctorId = getDoctorId(item);
    const doctorName = getDoctorName(item);
    const specialtyName = getSpecialtyName(item);
    const rating = getRating(item);
    const locationStr = getLocation(item);
    const fee = getConsultationFee(item);
    const available = isDoctorAvailable(item);
    const doctorImage = getDoctorImage(item);
    const imageUri = doctorImage ? normalizeImageUrl(doctorImage) : null;
    const isFavorited = favoriteDoctorIds.has(doctorId);
    const ratingCount = item.ratingCount || 
                       item.rating?.count || 
                       item.doctorProfile?.rating?.count || 
                       item.doctorProfile?.ratingCount || 
                       0;

    return (
      <TouchableOpacity
        style={styles.doctorCard}
        onPress={() => navigation.navigate('DoctorProfile', { doctorId })}
        activeOpacity={0.7}
      >
        <View style={styles.doctorImageContainer}>
          <Image
            source={imageUri ? { uri: imageUri } : defaultAvatar}
            style={styles.doctorImage}
            defaultSource={defaultAvatar}
          />
          {isPatient && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleFavoriteToggle(doctorId);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorited ? '#f44336' : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          {available && (
            <View style={styles.availableBadge}>
              <Text style={styles.availableBadgeText}>Available</Text>
            </View>
          )}
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName} numberOfLines={1}>{doctorName}</Text>
          <Text style={styles.doctorSpecialty} numberOfLines={1}>{specialtyName}</Text>
          <View style={styles.ratingContainer}>
            {renderStars(rating)}
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            {ratingCount > 0 && (
              <Text style={styles.reviewCount}>({ratingCount})</Text>
            )}
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>{locationStr}</Text>
          </View>
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>${fee || 'N/A'}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Booking', { doctorId })}
          >
            <Text style={styles.bookBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    if (page >= pagination.pages) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} activeOpacity={0.8}>
        <Ionicons name="cube-outline" size={20} color={colors.textWhite} />
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

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
              <Ionicons name="medical-outline" size={18} color={colors.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Specialty"
                placeholderTextColor={colors.textLight}
                value={selectedSpecialization}
                editable={false}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color={colors.textWhite} />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          Showing <Text style={styles.resultsCount}>{pagination.total}</Text> Doctors
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
            {/* <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('DoctorGrid')}
              activeOpacity={0.7}
            >
              <Ionicons name="grid" size={18} color={colors.textSecondary} />
            </TouchableOpacity> */}
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
      {isLoading && doctors.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Error Loading Doctors</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load doctors'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No doctors found</Text>
          <Text style={styles.emptyText}>Try adjusting your search criteria</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => getDoctorId(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={ListFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

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
                    {specializations.length === 0 ? (
                      <Text style={styles.emptyFilterText}>Loading specializations...</Text>
                    ) : (
                      specializations.map((spec: any) => {
                        const specId = spec._id || spec;
                        const specName = spec.name || spec;
                        const isSelected = selectedSpecialization === specId;
                        return (
                          <TouchableOpacity
                            key={specId}
                            style={styles.specialtyItem}
                            onPress={() => {
                              setSelectedSpecialization(isSelected ? '' : specId);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.checkboxContainer}>
                              <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxChecked
                              ]}>
                                {isSelected && (
                                  <Ionicons name="checkmark" size={12} color={colors.textWhite} />
                                )}
                              </View>
                              <Text style={styles.specialtyText}>{specName}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </>
              }
              contentContainerStyle={styles.modalBody}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSelectedSpecialization('');
                  setShowAvailability(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setShowFilters(false);
                  setPage(1); // Reset to first page when applying filters
                }}
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
  doctorImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  availableBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.success,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  availableBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyFilterText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default SearchScreen;
