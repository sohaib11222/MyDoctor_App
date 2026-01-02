import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role?: 'DOCTOR' | 'PATIENT';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: any;
    token: string;
  };
}

/**
 * Login user
 * @param {LoginCredentials} credentials - Email and password
 * @returns {Promise<AuthResponse>} User data and token
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  
  // Store token and user
  if (response.data?.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.data.token);
  }
  if (response.data?.user) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
  }
  
  return response;
};

/**
 * Register new user
 * @param {RegisterData} data - Registration data
 * @param {string} userType - User type: 'patient' or 'doctor'
 * @returns {Promise<AuthResponse>} User data and token
 */
export const register = async (
  data: RegisterData,
  userType: 'patient' | 'doctor' = 'patient'
): Promise<AuthResponse> => {
  // Map userType to backend role
  const roleMap: Record<string, 'DOCTOR' | 'PATIENT'> = {
    patient: 'PATIENT',
    doctor: 'DOCTOR',
  };

  const registrationData: RegisterData = {
    ...data,
    role: data.role || roleMap[userType] || 'PATIENT',
  };

  const response = await api.post<AuthResponse>('/auth/register', registrationData);
  
  // Store token and user (only if registration is complete)
  if (response.data?.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.data.token);
  }
  if (response.data?.user) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
  }
  
  return response;
};

/**
 * Get current user from token
 * @returns {Promise<any>} User data
 */
export const getUser = async (): Promise<any> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    throw new Error('No token found');
  }

  try {
    // Decode JWT token to get user info
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    // Fetch user by ID - axios interceptor will handle token refresh automatically
    const response = await api.get(`/users/${decoded.userId}`);
    return response.data || response;
  } catch (error: any) {
    // If error persists after refresh attempt, clear token
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
    }
    throw error;
  }
};

/**
 * Logout user (clear storage)
 * @returns {Promise<void>}
 */
export const logout = async (): Promise<void> => {
  await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
};

/**
 * Change user password
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<any>} Success message
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<any> => {
  const response = await api.post('/auth/change-password', {
    oldPassword,
    newPassword,
  });
  return response;
};

/**
 * Refresh JWT token
 * @param {string} refreshToken - Current token to refresh
 * @returns {Promise<string>} New token
 */
export const refreshToken = async (refreshToken: string): Promise<string> => {
  const response = await api.post('/auth/refresh-token', {
    refreshToken,
  });
  const newToken = response.data?.token || response.token || response;
  if (newToken) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
  }
  return newToken;
};

/**
 * Request password reset - Send OTP to email
 * @param {string} email - User email
 * @returns {Promise<any>} Success message
 */
export const requestPasswordReset = async (email: string): Promise<any> => {
  const response = await api.post('/auth/forgot-password', { email });
  return response;
};

/**
 * Verify password reset OTP code
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @returns {Promise<any>} Verification result
 */
export const verifyPasswordResetCode = async (email: string, code: string): Promise<any> => {
  const response = await api.post('/auth/verify-reset-code', { email, code });
  return response;
};

/**
 * Reset password with verified code
 * @param {string} email - User email
 * @param {string} code - Verified OTP code
 * @param {string} newPassword - New password
 * @returns {Promise<any>} Success message
 */
export const resetPassword = async (email: string, code: string, newPassword: string): Promise<any> => {
  const response = await api.post('/auth/reset-password', { email, code, newPassword });
  return response;
};

