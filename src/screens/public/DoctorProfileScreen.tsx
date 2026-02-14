import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as doctorApi from '../../services/doctor';
import * as favoriteApi from '../../services/favorite';
import * as reviewApi from '../../services/review';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type DoctorProfileScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'DoctorProfile'>;
type DoctorProfileRouteProp = RouteProp<HomeStackParamList, 'DoctorProfile'>;

const { width } = Dimensions.get('window');
const defaultAvatar = require('../../../assets/avatar.png');

const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') return null;
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) return null;
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
    if (normalizedUrl.includes('localhost')) normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    if (normalizedUrl.includes('127.0.0.1')) normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    return normalizedUrl;
  }
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

const DoctorProfileScreen = () => {
  const navigation = useNavigation<DoctorProfileScreenNavigationProp>();
  const route = useRoute<DoctorProfileRouteProp>();
  const { doctorId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bio');
  const { t } = useTranslation();

  // Fetch doctor profile
  const { data: doctorResponse, isLoading: doctorLoading, error: doctorError } = useQuery({
    queryKey: ['doctorProfile', doctorId],
    queryFn: () => doctorApi.getDoctorProfileById(doctorId),
    enabled: !!doctorId,
    retry: 1,
  });

  // Extract doctor data
  const doctor = useMemo(() => {
    if (!doctorResponse) return null;
    const responseData = doctorResponse.data || doctorResponse;
    return Array.isArray(responseData) ? responseData[0] : responseData;
  }, [doctorResponse]);

  // Fetch doctor reviews
  const { data: reviewsResponse, isLoading: reviewsLoading } = useQuery({
    queryKey: ['doctorReviews', doctorId],
    queryFn: () => reviewApi.getReviewsByDoctor(doctorId, { limit: 20, page: 1 }),
    enabled: !!doctorId,
  });

  const reviews = useMemo(() => {
    if (!reviewsResponse) return [];
    const responseData = reviewsResponse.data || reviewsResponse;
    return responseData.reviews || [];
  }, [reviewsResponse]);

  const reviewCount = useMemo(() => {
    if (!reviewsResponse) return doctor?.ratingCount || 0;
    const responseData = reviewsResponse.data || reviewsResponse;
    return responseData.pagination?.total || doctor?.ratingCount || 0;
  }, [reviewsResponse, doctor]);

  // Calculate experience years
  const experienceYears = useMemo(() => {
    if (!doctor?.experience || !Array.isArray(doctor.experience) || doctor.experience.length === 0) {
      return doctor?.experienceYears || 0;
    }
    const currentYear = new Date().getFullYear();
    const earliestYear = Math.min(
      ...doctor.experience
        .map((exp: any) => {
          const toYear = exp.toYear ? parseInt(exp.toYear) : currentYear;
          return toYear;
        })
        .filter((year: number) => !isNaN(year))
    );
    return currentYear - earliestYear;
  }, [doctor]);

  // Calculate awards count
  const awardsCount = useMemo(() => {
    if (!doctor?.awards || !Array.isArray(doctor.awards)) return 0;
    return doctor.awards.length;
  }, [doctor]);

  // Fetch user's favorites to check if this doctor is favorited
  const { data: favoritesResponse } = useQuery({
    queryKey: ['favorites', user?._id || user?.id],
    queryFn: () => favoriteApi.listFavorites(user?._id || user?.id!, { limit: 1000 }),
    enabled: !!user && user?.role === 'patient' && !!doctorId,
  });

  // Check if doctor is in favorites
  const isFavorited = useMemo(() => {
    if (!favoritesResponse || !doctorId) return false;
    const responseData = favoritesResponse.data || favoritesResponse;
    const favorites = responseData.favorites || [];
    return favorites.some((fav: any) => {
      if (!fav || !fav.doctorId) return false;
      const favDoctorId = fav.doctorId && typeof fav.doctorId === 'object' && fav.doctorId !== null 
        ? (fav.doctorId._id || fav.doctorId) 
        : fav.doctorId;
      return favDoctorId ? String(favDoctorId) === String(doctorId) : false;
    });
  }, [favoritesResponse, doctorId]);

  // Get favorite ID for removal
  const favoriteId = useMemo(() => {
    if (!favoritesResponse || !doctorId) return null;
    const responseData = favoritesResponse.data || favoritesResponse;
    const favorites = responseData.favorites || [];
    const favorite = favorites.find((fav: any) => {
      if (!fav || !fav.doctorId) return false;
      const favDoctorId = fav.doctorId && typeof fav.doctorId === 'object' && fav.doctorId !== null 
        ? (fav.doctorId._id || fav.doctorId) 
        : fav.doctorId;
      return favDoctorId ? String(favDoctorId) === String(doctorId) : false;
    });
    return favorite?._id || null;
  }, [favoritesResponse, doctorId]);

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: ({ doctorId, patientId }: { doctorId: string; patientId: string }) =>
      favoriteApi.addFavorite(doctorId, patientId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: t('screens.doctorProfile.toasts.addedToFavoritesTitle'),
        text2: t('screens.doctorProfile.toasts.addedToFavoritesBody'),
      });
      queryClient.invalidateQueries({ queryKey: ['favorites', user?._id || user?.id] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('screens.doctorProfile.errors.failedToAddFavorite');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
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
        text1: t('screens.doctorProfile.toasts.removedFromFavoritesTitle'),
        text2: t('screens.doctorProfile.toasts.removedFromFavoritesBody'),
      });
      queryClient.invalidateQueries({ queryKey: ['favorites', user?._id || user?.id] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('screens.doctorProfile.errors.failedToRemoveFavorite');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (!user || user?.role !== 'patient') {
      Toast.show({
        type: 'error',
        text1: t('screens.doctorProfile.errors.loginRequiredTitle'),
        text2: t('screens.doctorProfile.errors.loginRequiredBody'),
      });
      return;
    }

    if (!doctorId) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('screens.doctorProfile.errors.doctorIdNotFound'),
      });
      return;
    }

    const doctorIdStr = String(doctorId);
    const patientIdStr = String(user._id || user.id);

    if (isFavorited && favoriteId) {
      removeFavoriteMutation.mutate(favoriteId);
    } else {
      addFavoriteMutation.mutate({ doctorId: doctorIdStr, patientId: patientIdStr });
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      const doctorName = doctor?.userId?.fullName || doctor?.fullName || t('screens.doctorProfile.defaults.doctor');
      await Share.share({
        message: t('screens.doctorProfile.share.message', { name: doctorName }),
        title: doctorName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle view location
  const handleViewLocation = () => {
    if (doctor?.clinics?.[0]?.lat && doctor?.clinics?.[0]?.lng) {
      navigation.navigate('MapView');
    } else {
      Toast.show({
        type: 'info',
        text1: t('screens.doctorProfile.location.notAvailableTitle'),
        text2: t('screens.doctorProfile.location.notAvailableBody'),
      });
    }
  };

  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={16} color="#FFB800" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFB800" />);
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFB800" />);
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  // Extract doctor information
  const doctorName = doctor?.userId?.fullName || doctor?.fullName || t('screens.doctorProfile.defaults.unknownDoctor');
  const doctorImage = normalizeImageUrl(doctor?.userId?.profileImage || doctor?.profileImage);
  const specialization = doctor?.specialization?.name || t('screens.doctorProfile.defaults.general');
  const rating = doctor?.ratingAvg || 0;
  const firstClinic = doctor?.clinics?.[0];
  const clinicAddress = firstClinic
    ? `${firstClinic.address || ''}, ${firstClinic.city || ''}, ${firstClinic.state || ''}`.trim()
    : t('screens.doctorProfile.defaults.locationNotAvailable');
  const consultationFees = doctor?.consultationFees;
  const priceRange = consultationFees?.clinic && consultationFees?.online
    ? `$${consultationFees.clinic} - $${consultationFees.online}`
    : consultationFees?.clinic
    ? `$${consultationFees.clinic}`
    : consultationFees?.online
    ? `$${consultationFees.online}`
    : t('screens.doctorProfile.defaults.contactForPricing');

  if (doctorLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('screens.doctorProfile.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (doctorError || !doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>{t('screens.doctorProfile.doctorNotFoundTitle')}</Text>
          <Text style={styles.errorText}>
            {(doctorError as any)?.response?.data?.message ||
              (doctorError as any)?.message ||
              t('screens.doctorProfile.doctorNotFoundBody')}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t('screens.doctorProfile.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tabs = [
    { id: 'bio', label: t('screens.doctorProfile.tabs.bio') },
    { id: 'experience', label: t('screens.doctorProfile.tabs.experience') },
    { id: 'education', label: t('screens.doctorProfile.tabs.education') },
    { id: 'awards', label: t('screens.doctorProfile.tabs.awards') },
    { id: 'services', label: t('screens.doctorProfile.tabs.services') },
    { id: 'speciality', label: t('screens.doctorProfile.tabs.speciality') },
    { id: 'clinic', label: t('screens.doctorProfile.tabs.clinic') },
    { id: 'membership', label: t('screens.doctorProfile.tabs.membership') },
    { id: 'review', label: t('screens.doctorProfile.tabs.review') },
  ];

  // Add insurance tab if doctor accepts insurance
  if (doctor?.convenzionato === true && doctor?.insuranceCompanies && Array.isArray(doctor.insuranceCompanies) && doctor.insuranceCompanies.length > 0) {
    tabs.push({ id: 'insurance', label: t('screens.doctorProfile.tabs.insurance') });
  }

  // Add products tab if doctor has products
  if (doctor?.products && Array.isArray(doctor.products) && doctor.products.length > 0) {
    tabs.push({ id: 'products', label: t('screens.doctorProfile.tabs.products') });
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'bio':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.doctorBio')}</Text>
            {doctor?.biography ? (
              <Text style={styles.tabText}>{doctor.biography}</Text>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.biography')}</Text>
            )}
          </View>
        );

      case 'experience':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.experience')}</Text>
            {doctor?.experience && Array.isArray(doctor.experience) && doctor.experience.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.experience.map((exp: any, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{exp.hospital || t('screens.doctorProfile.defaults.hospitalNameNotAvailable')}</Text>
                    {exp.designation && <Text style={styles.listItemSubtitle}>{exp.designation}</Text>}
                    <Text style={styles.listItemText}>
                      {exp.fromYear && exp.toYear
                        ? `${exp.fromYear} - ${exp.toYear}`
                        : exp.fromYear
                        ? t('screens.doctorProfile.defaults.sinceYear', { year: exp.fromYear })
                        : t('screens.doctorProfile.defaults.datesNotAvailable')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.experience')}</Text>
            )}
          </View>
        );

      case 'education':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.education')}</Text>
            {doctor?.education && Array.isArray(doctor.education) && doctor.education.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.education.map((edu: any, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{edu.degree || t('screens.doctorProfile.defaults.degreeNotAvailable')}</Text>
                    {edu.college && <Text style={styles.listItemSubtitle}>{edu.college}</Text>}
                    {edu.year && <Text style={styles.listItemText}>{edu.year}</Text>}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.education')}</Text>
            )}
          </View>
        );

      case 'awards':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.awards')}</Text>
            {doctor?.awards && Array.isArray(doctor.awards) && doctor.awards.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.awards.map((award: any, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listItemTitle}>{award.title || t('screens.doctorProfile.defaults.awardTitleNotAvailable')}</Text>
                    {award.year && <Text style={styles.listItemText}>{award.year}</Text>}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.awards')}</Text>
            )}
          </View>
        );

      case 'services':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.services')}</Text>
            {doctor?.services && Array.isArray(doctor.services) && doctor.services.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.services.map((service: any, index: number) => (
                  <View key={index} style={styles.serviceItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    <View style={styles.serviceContent}>
                      <Text style={styles.serviceName}>{service.name || t('screens.doctorProfile.defaults.serviceName')}</Text>
                      {service.price && (
                        <Text style={styles.servicePrice}>${service.price}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.services')}</Text>
            )}
          </View>
        );

      case 'speciality':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.speciality')}</Text>
            {doctor?.specialization ? (
              <View>
                <Text style={styles.specialityName}>{doctor.specialization.name || specialization}</Text>
                {doctor.specialization.description && (
                  <Text style={styles.tabText}>{doctor.specialization.description}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.speciality')}</Text>
            )}
          </View>
        );

      case 'clinic':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.clinics')}</Text>
            {doctor?.clinics && Array.isArray(doctor.clinics) && doctor.clinics.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.clinics.map((clinic: any, index: number) => (
                  <View key={index} style={styles.clinicItem}>
                    <Text style={styles.clinicName}>{clinic.name || t('screens.doctorProfile.defaults.clinicNameNotAvailable')}</Text>
                    {clinic.address && (
                      <View style={styles.clinicDetail}>
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                        <Text style={styles.clinicDetailText}>
                          {clinic.address}
                          {clinic.city && `, ${clinic.city}`}
                          {clinic.state && `, ${clinic.state}`}
                          {clinic.country && `, ${clinic.country}`}
                        </Text>
                      </View>
                    )}
                    {clinic.phone && (
                      <View style={styles.clinicDetail}>
                        <Ionicons name="call-outline" size={16} color={colors.primary} />
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${clinic.phone}`)}>
                          <Text style={[styles.clinicDetailText, styles.clinicPhone]}>{clinic.phone}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {clinic.lat && clinic.lng && (
                      <TouchableOpacity
                        style={styles.directionsButton}
                        onPress={() => navigation.navigate('MapView')}
                      >
                        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                        <Text style={styles.directionsButtonText}>{t('screens.doctorProfile.actions.getDirections')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.clinic')}</Text>
            )}
          </View>
        );

      case 'membership':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.memberships')}</Text>
            {doctor?.memberships && Array.isArray(doctor.memberships) && doctor.memberships.length > 0 ? (
              <View style={styles.listContainer}>
                {doctor.memberships.map((membership: any, index: number) => (
                  <View key={index} style={styles.membershipItem}>
                    <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                    <Text style={styles.membershipText}>
                      {membership.name || t('screens.doctorProfile.defaults.membershipNameNotAvailable')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.membership')}</Text>
            )}
          </View>
        );

      case 'review':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.reviewsWithCount', { count: reviewCount })}</Text>
            {reviewsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>{t('screens.doctorProfile.loadingReviews')}</Text>
              </View>
            ) : reviews && reviews.length > 0 ? (
              <View style={styles.listContainer}>
                {reviews.map((review: any) => {
                  const patientImage = normalizeImageUrl(review.patientId?.profileImage);
                  return (
                    <View key={review._id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <Image
                          source={patientImage ? { uri: patientImage } : defaultAvatar}
                          style={styles.reviewerImage}
                          defaultSource={defaultAvatar}
                        />
                        <View style={styles.reviewInfo}>
                          <Text style={styles.reviewerName}>
                            {review.patientId?.fullName || t('screens.doctorProfile.defaults.anonymous')}
                          </Text>
                          <View style={styles.reviewRating}>
                            {renderStars(review.rating || 0)}
                            <Text style={styles.reviewRatingText}>
                              {(review.rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {review.reviewText && <Text style={styles.reviewComment}>{review.reviewText}</Text>}
                      {review.createdAt && (
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.reviews')}</Text>
            )}
          </View>
        );

      case 'insurance':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.acceptedInsuranceCompanies')}</Text>
            {doctor?.convenzionato === true && doctor?.insuranceCompanies && Array.isArray(doctor.insuranceCompanies) && doctor.insuranceCompanies.length > 0 ? (
              <View>
                <View style={styles.insuranceHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={styles.insuranceHeaderText}>{t('screens.doctorProfile.insurance.acceptsInsurance')}</Text>
                </View>
                <Text style={styles.insuranceSubtitle}>
                  {t('screens.doctorProfile.insurance.subtitle')}
                </Text>
                <View style={styles.insuranceGrid}>
                  {doctor.insuranceCompanies.map((insurance: any, index: number) => {
                    const insuranceId = insurance._id || insurance.id || insurance;
                    const insuranceName = typeof insurance === 'object' && insurance !== null
                      ? (insurance.name || t('screens.doctorProfile.defaults.insuranceCompany'))
                      : t('screens.doctorProfile.defaults.insuranceCompany');
                    const logoUrl = typeof insurance === 'object' && insurance !== null && insurance.logo
                      ? normalizeImageUrl(insurance.logo)
                      : null;

                    return (
                      <View key={insuranceId || index} style={styles.insuranceCard}>
                        {logoUrl ? (
                          <Image
                            source={{ uri: logoUrl }}
                            style={styles.insuranceLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.insurancePlaceholder}>
                            <Ionicons name="shield" size={32} color={colors.textSecondary} />
                          </View>
                        )}
                        <Text style={styles.insuranceName} numberOfLines={2}>
                          {insuranceName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.insurance')}</Text>
            )}
          </View>
        );

      case 'products':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{t('screens.doctorProfile.sections.productsWithCount', { count: doctor?.products?.length || 0 })}</Text>
            {doctor?.products && Array.isArray(doctor.products) && doctor.products.length > 0 ? (
              <FlatList
                data={doctor.products}
                numColumns={2}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const productImage = item.images && item.images.length > 0
                    ? normalizeImageUrl(item.images[0])
                    : null;
                  const productPrice = item.discountPrice || item.price || 0;
                  const originalPrice = item.discountPrice ? item.price : null;

                  return (
                    <TouchableOpacity
                      style={styles.productCard}
                      onPress={() => {
                        // Navigate to product details if needed
                        Toast.show({
                          type: 'info',
                          text1: t('screens.doctorProfile.toasts.productDetailsTitle'),
                          text2: t('screens.doctorProfile.toasts.productDetailsBody'),
                        });
                      }}
                    >
                      <Image
                        source={productImage ? { uri: productImage } : defaultAvatar}
                        style={styles.productImage}
                        defaultSource={defaultAvatar}
                      />
                      <Text style={styles.productName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={styles.productPriceContainer}>
                        <Text style={styles.productPrice}>${productPrice.toFixed(2)}</Text>
                        {originalPrice && (
                          <Text style={styles.productOriginalPrice}>${originalPrice.toFixed(2)}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.products')}</Text>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{tabs.find(t => t.id === activeTab)?.label}</Text>
            <Text style={styles.emptyText}>{t('screens.doctorProfile.empty.comingSoon')}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Doctor Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={doctorImage ? { uri: doctorImage } : defaultAvatar}
              style={styles.doctorImage}
              defaultSource={defaultAvatar}
            />
            <View style={styles.profileInfo}>
              <View style={styles.availabilityBadge}>
                <View style={styles.availabilityDot} />
                <Text style={styles.availabilityText}>{t('screens.doctorProfile.badges.available')}</Text>
              </View>
              <Text style={styles.doctorName}>
                {doctorName}
                {doctor?.isVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.primary}
                    style={styles.verifiedIcon}
                  />
                )}
              </Text>
              <View style={styles.specialtyBadge}>
                <View style={styles.specialtyDot} />
                <Text style={styles.specialtyText}>{specialization}</Text>
              </View>
              {doctor?.title && <Text style={styles.qualification}>{doctor.title}</Text>}
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.addressText} numberOfLines={2}>
                  {clinicAddress}
                </Text>
              </View>
              {firstClinic?.lat && firstClinic?.lng && (
                <TouchableOpacity onPress={handleViewLocation} activeOpacity={0.7}>
                  <Text style={styles.viewLocationText}>{t('screens.doctorProfile.actions.viewLocation')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.activitiesContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>
                  {t('screens.doctorProfile.activity.fullTime')}{doctor?.isAvailableOnline ? `, ${t('screens.doctorProfile.activity.onlineTherapyAvailable')}` : ''}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleFavoriteToggle}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isFavorited ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isFavorited ? colors.error : colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
                  <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    // Copy link functionality
                    Toast.show({
                      type: 'info',
                      text1: t('screens.doctorProfile.toasts.linkCopiedTitle'),
                      text2: t('screens.doctorProfile.toasts.linkCopiedBody'),
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="thumbs-up-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>
                  <Text style={styles.boldText}>
                    {rating >= 4.5 ? '94%' : rating >= 4 ? '85%' : rating >= 3.5 ? '75%' : '60%'}
                  </Text>{' '}
                  {t('screens.doctorProfile.activity.recommended')}
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="business-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>
                  {firstClinic?.name || t('screens.doctorProfile.defaults.clinicNameNotAvailable')}
                </Text>
              </View>
              <View style={styles.acceptingBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.acceptingText}>{t('screens.doctorProfile.badges.acceptingNewPatients')}</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.ratingContainer}>
                {renderStars(rating)}
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('review')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reviewsLink}>
                    {t('screens.doctorProfile.reviewsLink', { count: reviewCount })}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => {
                    // Navigate to chat
                    Toast.show({
                      type: 'info',
                      text1: 'Chat',
                      text2: 'Chat functionality coming soon',
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.textWhite} />
                  <Text style={styles.contactBtnText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactBtn, styles.audioBtn]}
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Audio Call',
                      text2: 'Audio call functionality coming soon',
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call-outline" size={16} color={colors.textWhite} />
                  <Text style={styles.contactBtnText}>Audio</Text>
                </TouchableOpacity>
              </View> */}
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>
                {reviewCount > 0 ? t('screens.doctorProfile.stats.reviewsCount', { count: reviewCount }) : t('screens.doctorProfile.stats.noReviewsYet')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.text }]}>
                <Ionicons name="trophy-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>
                {experienceYears > 0
                  ? t('screens.doctorProfile.stats.inPracticeForYears', { count: experienceYears })
                  : t('screens.doctorProfile.stats.experienceNotAvailable')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="star-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>
                {awardsCount > 0 ? t('screens.doctorProfile.stats.awardsCount', { count: awardsCount }) : t('screens.doctorProfile.stats.noAwardsListed')}
              </Text>
            </View>
          </View>

          <View style={styles.bookingContainer}>
            <Text style={styles.priceText}>
              {t('screens.doctorProfile.booking.priceForSession', { price: priceRange })}
            </Text>
            <TouchableOpacity
              style={styles.bookAppointmentBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Booking', { doctorId })}
            >
              <Text style={styles.bookAppointmentText}>{t('screens.doctorProfile.booking.bookAppointment')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
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
    padding: 40,
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
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  specialtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  specialtyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  qualification: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  viewLocationText: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  activitiesContainer: {
    marginBottom: 20,
  },
  activityItem: {
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityText: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  acceptingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  acceptingText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  reviewsLink: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 8,
  },
  contactButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  audioBtn: {
    backgroundColor: '#8B5CF6',
  },
  contactBtnText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statText: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  bookingContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  priceAmount: {
    fontWeight: '600',
    color: colors.text,
  },
  bookAppointmentBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookAppointmentText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: colors.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  listItemText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceContent: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  specialityName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  clinicItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  clinicDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clinicDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  clinicPhone: {
    color: colors.primary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  directionsButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  membershipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    minHeight: 32,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  insuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight || colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  insuranceHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success || colors.primary,
    flex: 1,
  },
  insuranceSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  insuranceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insuranceCard: {
    width: '48%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
  },
  insuranceLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  insurancePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insuranceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    minHeight: 36,
  },
});

export default DoctorProfileScreen;
