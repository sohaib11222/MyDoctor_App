import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Refresh token function (defined here to avoid circular dependency)
const refreshToken = async (token: string): Promise<string> => {
        // Use raw axios to avoid interceptor loop
        // Use the configured API_BASE_URL
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken: token },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
  return response.data?.data?.token || response.data?.token || response.data;
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Log API configuration in development
if (__DEV__) {
  console.log('🔧 Axios configured with baseURL:', API_BASE_URL);
}

// Request interceptor - Add token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Set Content-Type based on data type
      // For FormData, DO NOT set Content-Type - axios will set it with boundary automatically
      // This is critical for React Native FormData to work correctly
      if (config.data instanceof FormData) {
        // Remove any existing Content-Type to let axios set it with boundary
        delete config.headers['Content-Type'];
      } else if (!config.headers['Content-Type']) {
        // Set Content-Type to application/json for non-FormData requests
        config.headers['Content-Type'] = 'application/json';
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response.data, // Return data directly
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip refresh for refresh-token endpoint to prevent infinite loops
    if (originalRequest?.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        
        // If no token, clear storage and reject
        if (!token) {
          await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
          processQueue(new Error('No token found'), null);
          isRefreshing = false;
          return Promise.reject(error);
        }

        // Try to refresh the token
        const newToken = await refreshToken(token);
        
        // Update token in AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Process queued requests
        processQueue(null, newToken);
        isRefreshing = false;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear storage and reject
        processQueue(refreshError, null);
        isRefreshing = false;
        await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

