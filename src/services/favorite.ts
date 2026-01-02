import api from './api';

/**
 * Favorite API Service
 * For managing patient's favorite doctors
 */

export interface Favorite {
  _id: string;
  patientId: string;
  doctorId: string | {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface FavoriteListResponse {
  success: boolean;
  message: string;
  data: {
    favorites: Favorite[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface FavoriteResponse {
  success: boolean;
  message: string;
  data: Favorite;
}

/**
 * Add favorite doctor
 * @param {string} doctorId - Doctor ID
 * @param {string} patientId - Patient ID (optional, backend uses token if not provided)
 * @returns {Promise<FavoriteResponse>} Created favorite
 */
export const addFavorite = async (doctorId: string, patientId?: string): Promise<FavoriteResponse> => {
  const requestBody: any = {
    doctorId: String(doctorId),
  };
  
  if (patientId) {
    requestBody.patientId = String(patientId);
  }
  
  const response = await api.post('/favorite', requestBody);
  return response;
};

/**
 * List favorites for patient
 * @param {string} patientId - Patient ID
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<FavoriteListResponse>} Favorites list with pagination
 */
export const listFavorites = async (
  patientId: string,
  params: { page?: number; limit?: number } = {}
): Promise<FavoriteListResponse> => {
  const response = await api.get(`/favorite/${patientId}`, { params });
  return response;
};

/**
 * Remove favorite
 * @param {string} favoriteId - Favorite ID
 * @returns {Promise<{ success: boolean; message: string }>} Success message
 */
export const removeFavorite = async (favoriteId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/favorite/${favoriteId}`);
  return response;
};

