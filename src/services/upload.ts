import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import api from './api';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

/**
 * Upload doctor verification documents
 * @param {FormData} formData - FormData containing files (field name should be 'files')
 * @returns {Promise<any>} Upload response with file URLs
 */
export const uploadDoctorDocs = async (formData: FormData): Promise<any> => {
  try {
    // Get token for authentication
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    
    // Ensure API_BASE_URL is defined
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }
    
    // Log API_BASE_URL for debugging
    if (__DEV__) {
      console.log('🔗 API_BASE_URL:', API_BASE_URL);
      console.log('🔗 Full upload URL:', `${API_BASE_URL}/upload/doctor-docs`);
      console.log('🔗 API_BASE_URL type:', typeof API_BASE_URL);
    }
    
    // Use raw axios instance with baseURL set correctly
    // React Native FormData needs special handling
    const response = await axios.post(
      '/upload/doctor-docs', // Relative URL - baseURL will be prepended
      formData,
      {
        baseURL: API_BASE_URL, // Set baseURL explicitly - ensure it's a string
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          // DO NOT set Content-Type - let axios set it with boundary automatically
          // This is critical for React Native FormData
        },
        timeout: 60000, // 60 seconds for file uploads
        // React Native FormData requires transformRequest to be undefined or return data as-is
        transformRequest: (data) => {
          // Return FormData as-is - don't transform it
          return data;
        },
      }
    );
    
    // Return response.data (not using interceptor, so we need to extract manually)
    return response.data || response;
  } catch (error: any) {
    // Log detailed error for debugging
    if (__DEV__) {
      console.error('❌ Upload error details:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        config: {
          url: error?.config?.url,
          method: error?.config?.method,
          baseURL: error?.config?.baseURL,
          timeout: error?.config?.timeout,
          headers: error?.config?.headers,
        },
      });
    }
    throw error;
  }
};

/**
 * Upload profile image
 * @param {FormData} formData - FormData containing file (field name should be 'file')
 * @returns {Promise<any>} Upload response with file URL
 */
/**
 * Upload profile image
 * Uses the api service which handles authentication and FormData automatically
 * @param {FormData} formData - FormData containing file (field name should be 'file')
 * @returns {Promise<any>} Upload response with file URL
 */
export const uploadProfileImage = async (formData: FormData): Promise<any> => {
  try {
    // Ensure API_BASE_URL is defined
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }
    
    // Log API_BASE_URL for debugging
    if (__DEV__) {
      console.log('🔗 Profile Image Upload - API_BASE_URL:', API_BASE_URL);
      console.log('🔗 Full upload URL:', `${API_BASE_URL}/upload/profile`);
    }
    
    // Use the api service which handles authentication automatically
    // The api service already has interceptors for token management
    // For FormData, the api service will handle Content-Type automatically (removes it to let axios set boundary)
    const response = await api.post('/upload/profile', formData);
    
    // The api interceptor returns response.data, so we get the data directly
    return response;
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Profile image upload error:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
      });
    }
    throw error;
  }
};

/**
 * Upload product images (multiple files)
 * @param {FormData} formData - FormData containing files (field name should be 'files')
 * @returns {Promise<string[]>} Array of uploaded image URLs
 */
export const uploadProductImages = async (formData: FormData): Promise<string[]> => {
  try {
    // Ensure API_BASE_URL is defined
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }
    
    // Log API_BASE_URL for debugging
    if (__DEV__) {
      console.log('🔗 Product Images Upload - API_BASE_URL:', API_BASE_URL);
      console.log('🔗 Full upload URL:', `${API_BASE_URL}/upload/product`);
    }
    
    // Use the api service which handles authentication automatically
    const response = await api.post('/upload/product', formData);
    
    // The api interceptor returns response.data
    // Response structure: { success: true, data: { urls: [...] } } or { success: true, data: { url: "..." } }
    const responseData = response?.data || response;
    
    // Handle multiple URLs
    if (responseData?.urls && Array.isArray(responseData.urls)) {
      return responseData.urls;
    }
    
    // Fallback: if single url returned
    if (responseData?.url) {
      return [responseData.url];
    }
    
    // If response.data is an array directly
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    return [];
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Product images upload error:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
      });
    }
    throw error;
  }
};

/**
 * Upload general file (for medical records, etc.)
 * @param {FormData} formData - FormData containing file (field name should be 'file')
 * @returns {Promise<string>} Uploaded file URL
 */
export const uploadGeneralFile = async (formData: FormData): Promise<string> => {
  try {
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }
    if (__DEV__) {
      console.log('🔗 General File Upload - API_BASE_URL:', API_BASE_URL);
      console.log('🔗 Full upload URL:', `${API_BASE_URL}/upload/general`);
    }
    const response = await api.post('/upload/general', formData);
    
    // The api interceptor returns response.data
    // Response structure: { success: true, data: { url: "..." } }
    const responseData = response?.data || response;
    
    // Extract URL
    const fileUrl = responseData?.url || responseData?.data?.url;
    
    if (!fileUrl) {
      throw new Error('No file URL returned from server');
    }
    
    // Ensure absolute URL
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    const baseUrl = API_BASE_URL.replace('/api', '');
    const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `${baseUrl}${normalizedPath}`;
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ General file upload error:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
      });
    }
    throw error;
  }
};

