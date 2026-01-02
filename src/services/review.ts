import api from './api';

/**
 * Review API
 * For managing doctor reviews
 */

export interface Review {
  _id: string;
  doctorId: string;
  patientId: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  appointmentId?: string;
  rating: number;
  reviewText?: string;
  reviewType: 'OVERALL' | 'APPOINTMENT';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  success: boolean;
  message: string;
  data: {
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface DoctorProfileResponse {
  success: boolean;
  message: string;
  data: {
    ratingAvg: number;
    ratingCount: number;
  };
}

/**
 * Get doctor's reviews
 * @param params - Query parameters (page, limit)
 * @returns Promise<ReviewsResponse>
 */
export const getDoctorReviews = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ReviewsResponse> => {
  const response = await api.get('/doctor/reviews', { params });
  return response;
};

/**
 * Get reviews by doctor ID (public)
 * @param doctorId - Doctor user ID
 * @param params - Query parameters (page, limit)
 * @returns Promise<ReviewsResponse>
 */
export const getReviewsByDoctor = async (
  doctorId: string,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ReviewsResponse> => {
  const response = await api.get(`/reviews/doctor/${doctorId}`, { params });
  return response;
};

