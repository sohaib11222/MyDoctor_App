import api from './api';

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<any>} User data
 */
export const getUserById = async (userId: string): Promise<any> => {
  const response = await api.get(`/users/${userId}`);
  return response.data || response;
};

