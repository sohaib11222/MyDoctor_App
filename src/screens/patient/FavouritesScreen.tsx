import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreStackParamList, TabParamList, HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as favoriteApi from '../../services/favorite';
import * as doctorApi from '../../services/doctor';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type FavouritesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

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
    deviceHost = match ? match[1] : '192.168.0.114';
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

export const FavouritesScreen = () => {
  const navigation = useNavigation<FavouritesScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;
  const [refreshing, setRefreshing] = useState(false);

  // Fetch favorites
  const {
    data: favoritesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['favorites', user?._id || user?.id, page],
    queryFn: () => favoriteApi.listFavorites(user?._id || user?.id || '', { page, limit }),
    enabled: !!user,
    retry: 1,
  });

  // Extract favorites
  const favorites = useMemo(() => {
    if (!favoritesData) return [];
    const responseData = favoritesData.data || favoritesData;
    return Array.isArray(responseData) ? responseData : (responseData.favorites || []);
  }, [favoritesData]);

  const pagination = useMemo(() => {
    if (!favoritesData) return null;
    const responseData = favoritesData.data || favoritesData;
    return responseData.pagination || null;
  }, [favoritesData]);

  // Extract doctor IDs from favorites
  const doctorIds = useMemo(() => {
    return favorites
      .map((fav) => {
        // Check if fav or fav.doctorId is null/undefined
        if (!fav || !fav.doctorId || fav.doctorId === null) {
          return null;
        }
        const doctorId = typeof fav.doctorId === 'object' ? fav.doctorId._id || fav.doctorId : fav.doctorId;
        return doctorId;
      })
      .filter((id): id is string => Boolean(id)); // Filter out null/undefined values
  }, [favorites]);

  // Fetch doctor profiles for favorites
  const { data: doctorsData } = useQuery({
    queryKey: ['favoriteDoctors', doctorIds],
    queryFn: async () => {
      const doctorPromises = doctorIds.map((id) => doctorApi.getDoctorProfileById(String(id)));
      const results = await Promise.all(doctorPromises);
      return results.map((result) => {
        const data = result.data || result;
        return Array.isArray(data) ? data[0] : data;
      });
    },
    enabled: doctorIds.length > 0,
  });

  // Create a map of doctorId to doctor profile
  const doctorProfilesMap = useMemo(() => {
    if (!doctorsData || !Array.isArray(doctorsData)) return {};
    const map: Record<string, any> = {};
    doctorsData.forEach((doctor) => {
      const doctorId = doctor.userId?._id || doctor._id;
      if (doctorId) {
        map[String(doctorId)] = doctor;
      }
    });
    return map;
  }, [doctorsData]);

  // Combine favorites with doctor profiles
  const favoritesWithDetails = useMemo(() => {
    return favorites
      .map((favorite) => {
        // Check if favorite or favorite.doctorId is null/undefined
        if (!favorite || !favorite.doctorId || favorite.doctorId === null) {
          return null;
        }
        
        const doctorId =
          typeof favorite.doctorId === 'object' ? favorite.doctorId._id || favorite.doctorId : favorite.doctorId;
        const doctorProfile = doctorProfilesMap[String(doctorId)];
        const doctor = favorite.doctorId || {};

        return {
          ...favorite,
          doctorId: String(doctorId),
          doctor: doctorProfile || {
            userId: {
              fullName: (doctor as any).fullName || 'Unknown Doctor',
              profileImage: (doctor as any).profileImage || null,
            },
            specialization: doctorProfile?.specialization || { name: 'General' },
            ratingAvg: doctorProfile?.ratingAvg || 0,
            ratingCount: doctorProfile?.ratingCount || 0,
            clinics: doctorProfile?.clinics || [],
          },
        };
      })
      .filter((fav): fav is NonNullable<typeof fav> => fav !== null); // Filter out null values
  }, [favorites, doctorProfilesMap]);

  // Filter favorites by search query
  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favoritesWithDetails;

    const query = searchQuery.toLowerCase();
    return favoritesWithDetails.filter((fav) => {
      const doctorName = fav.doctor?.userId?.fullName || fav.doctor?.fullName || '';
      const specialization = fav.doctor?.specialization?.name || '';
      return doctorName.toLowerCase().includes(query) || specialization.toLowerCase().includes(query);
    });
  }, [favoritesWithDetails, searchQuery]);

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId: string) => favoriteApi.removeFavorite(favoriteId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.favourites.toasts.removed'),
      });
      queryClient.invalidateQueries(['favorites', user?._id || user?.id]);
      refetch();
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || error.message || t('more.favourites.errors.failedToRemove');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Handle remove favorite
  const handleRemoveFavorite = (favoriteId: string) => {
    Alert.alert(t('more.favourites.alerts.removeTitle'), t('more.favourites.alerts.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => removeFavoriteMutation.mutate(favoriteId),
      },
    ]);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (pagination && page < pagination.pages) {
      setPage((prev) => prev + 1);
    }
  };

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return t('common.na');
    return new Date(date).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= ratingValue ? 'star' : 'star-outline'}
          size={14}
          color={i <= ratingValue ? colors.warning : colors.textLight}
        />
      );
    }
    return stars;
  };

  const handleBookAppointment = (doctorId: string) => {
    (navigation as any).navigate('Home', { screen: 'Booking', params: { doctorId } });
  };

  const handleViewProfile = (doctorId: string) => {
    (navigation as any).navigate('Home', { screen: 'DoctorProfile', params: { doctorId } });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.favourites.loadingFavorites')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>{t('more.favourites.error.title')}</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : t('more.favourites.error.pleaseTryRefreshing')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('more.favourites.searchPlaceholder')}
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Favourites List */}
      {filteredFavorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>{t('more.favourites.empty.title')}</Text>
          <Text style={styles.emptyText}>{t('more.favourites.empty.body')}</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => (navigation as any).navigate('Home', { screen: 'Search' })}
          >
            <Text style={styles.browseButtonText}>{t('more.favourites.empty.browseDoctors')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => item._id}
          renderItem={({ item: fav }) => {
            const doctorId = fav.doctorId;
            const doctor = fav.doctor;
            const doctorName = doctor?.userId?.fullName || doctor?.fullName || t('common.unknownDoctor');
            const doctorImage = doctor?.userId?.profileImage || doctor?.profileImage;
            const normalizedImageUrl = normalizeImageUrl(doctorImage);
            const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
            const specialization = doctor?.specialization?.name || t('common.general');
            const rating = doctor?.ratingAvg || 0;
            const ratingCount = doctor?.ratingCount || 0;
            const location = doctor?.clinics?.[0]
              ? `${doctor.clinics[0].city || ''}${doctor.clinics[0].state ? `, ${doctor.clinics[0].state}` : ''}`.trim() ||
                t('home.patient.locationNotAvailable')
              : t('home.patient.locationNotAvailable');
            const lastBook = formatDate(fav.createdAt);

            return (
              <View style={styles.favouriteCard}>
                <TouchableOpacity
                  style={styles.favouriteButton}
                  onPress={() => handleRemoveFavorite(fav._id)}
                  disabled={removeFavoriteMutation.isLoading}
                >
                  <Ionicons name="heart" size={20} color={colors.error} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.doctorInfo} onPress={() => handleViewProfile(doctorId)}>
                  <Image source={imageSource} style={styles.doctorImage} defaultSource={defaultAvatar} />
                  <View style={styles.doctorDetails}>
                    <View style={styles.doctorNameRow}>
                      <Text style={styles.doctorName}>{doctorName}</Text>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    </View>
                    <Text style={styles.speciality}>{specialization}</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.stars}>{renderStars(rating)}</View>
                      <Text style={styles.ratingText}>
                        {rating.toFixed(1)} ({ratingCount})
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{location}</Text>
                    </View>
                    <Text style={styles.lastBook}>{t('more.favourites.addedOn', { date: lastBook })}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={() => handleViewProfile(doctorId)}
                  >
                    <Text style={styles.viewProfileButtonText}>{t('more.favourites.actions.viewProfile')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => handleBookAppointment(doctorId)}
                  >
                    <Text style={styles.bookButtonText}>{t('more.favourites.actions.bookNow')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
          ListFooterComponent={
            pagination && page < pagination.pages ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadMoreText}>{t('more.favourites.loadingMore')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
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
  listContent: {
    paddingBottom: 16,
  },
  favouriteCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  favouriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: 6,
  },
  speciality: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  lastBook: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
