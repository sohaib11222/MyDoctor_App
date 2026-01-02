import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as reviewApi from '../../services/review';
import * as profileApi from '../../services/user';
import { API_BASE_URL } from '../../config/api';

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

/**
 * Render stars based on rating
 */
const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => {
        if (star <= fullStars) {
          return <Ionicons key={star} name="star" size={16} color={colors.warning} />;
        } else if (star === fullStars + 1 && hasHalfStar) {
          return <Ionicons key={star} name="star-half" size={16} color={colors.warning} />;
        } else {
          return <Ionicons key={star} name="star-outline" size={16} color={colors.textLight} />;
        }
      })}
    </View>
  );
};

/**
 * Format date
 */
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ReviewsScreen = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [refreshing, setRefreshing] = useState(false);

  // Fetch doctor profile for overall rating
  const { data: doctorProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: async () => {
      // Assuming we have a getDoctorProfile function in user service
      // For now, we'll use the reviews endpoint to get rating info
      const response = await reviewApi.getDoctorReviews({ page: 1, limit: 1 });
      return response;
    },
    enabled: !!user,
  });

  // Fetch reviews
  const { data: reviewsData, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorReviews', page],
    queryFn: () => reviewApi.getDoctorReviews({ page, limit }),
    enabled: !!user,
  });

  // Extract reviews and pagination
  const reviews = useMemo(() => {
    if (!reviewsData?.data) return [];
    return reviewsData.data.reviews || [];
  }, [reviewsData]);

  const pagination = useMemo(() => {
    if (!reviewsData?.data) return { page: 1, limit: 10, total: 0, pages: 1 };
    return reviewsData.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 };
  }, [reviewsData]);

  // Calculate overall rating from reviews
  const overallRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const ratingCount = pagination.total || reviews.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchProfile()]);
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPage(newPage);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const totalPages = pagination.pages;
    const currentPage = pagination.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Reviews</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load reviews'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Overall Rating Section */}
        <View style={styles.overallSection}>
          <View style={styles.overallContent}>
            <View style={styles.ratingSection}>
              <Text style={styles.overallTitle}>Overall Rating</Text>
              <View style={styles.overallStars}>
                <Text style={styles.ratingValue}>{overallRating.toFixed(1)}</Text>
                {renderStars(overallRating)}
                <Text style={styles.ratingCount}>
                  ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>Reviews from patients will appear here</Text>
            </View>
          ) : (
            <>
              {reviews.map((review) => {
                const patientImage = normalizeImageUrl(review.patientId?.profileImage);
                return (
                  <View key={review._id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.patientInfo}>
                        <Image
                          source={patientImage ? { uri: patientImage } : defaultAvatar}
                          style={styles.patientAvatar}
                        />
                        <View>
                          <Text style={styles.patientName}>
                            {review.patientId?.fullName || 'Anonymous'}
                          </Text>
                          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                          {review.reviewType === 'APPOINTMENT' && (
                            <Text style={styles.reviewType}>Appointment Review</Text>
                          )}
                        </View>
                      </View>
                      {renderStars(review.rating)}
                    </View>
                    <View style={styles.reviewContent}>
                      {review.reviewText ? (
                        <Text style={styles.reviewText}>{review.reviewText}</Text>
                      ) : (
                        <Text style={[styles.reviewText, styles.noCommentText]}>
                          No comment provided
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                    onPress={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <Text
                      style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.paginationNumbers}>
                    {getPageNumbers().map((pageNum, index) => {
                      if (pageNum === '...') {
                        return (
                          <Text key={`ellipsis-${index}`} style={styles.paginationEllipsis}>
                            ...
                          </Text>
                        );
                      }
                      const pageNumber = pageNum as number;
                      return (
                        <TouchableOpacity
                          key={pageNumber}
                          style={[
                            styles.paginationNumber,
                            page === pageNumber && styles.paginationNumberActive,
                          ]}
                          onPress={() => handlePageChange(pageNumber)}
                        >
                          <Text
                            style={[
                              styles.paginationNumberText,
                              page === pageNumber && styles.paginationNumberTextActive,
                            ]}
                          >
                            {pageNumber}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      page === pagination.pages && styles.paginationButtonDisabled,
                    ]}
                    onPress={() => handlePageChange(page + 1)}
                    disabled={page === pagination.pages}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        page === pagination.pages && styles.paginationButtonTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overallSection: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 16,
  },
  overallContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingSection: {
    flex: 1,
  },
  overallTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  overallStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  reviewsList: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  reviewItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewType: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewContent: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  noCommentText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: colors.textWhite,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationNumbers: {
    flexDirection: 'row',
    gap: 4,
  },
  paginationNumber: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationNumberActive: {
    backgroundColor: colors.primary,
  },
  paginationNumberText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  paginationNumberTextActive: {
    color: colors.textWhite,
  },
  paginationEllipsis: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 8,
    lineHeight: 36,
  },
});
