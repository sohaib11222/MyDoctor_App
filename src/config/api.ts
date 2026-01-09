import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * Live backend URL for production
 */

// Live API base URL
const LIVE_API_URL = 'https://mydoctoradmin.mydoctorplus.it/api';

// Platform-specific URLs
const getApiBaseUrl = (): string => {
  // Check if there's an environment variable or config override
  // You can create a .env file or use React Native Config
  const envUrl = process.env.API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Use live URL for all platforms
  return LIVE_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL in development for debugging
if (__DEV__) {
  console.log('📱 API Base URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
}

export default API_BASE_URL;

