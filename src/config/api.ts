import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * IMPORTANT: Update these URLs based on your setup:
 * 
 * For Android Emulator: Use http://10.0.2.2:5000/api
 * For iOS Simulator: Use http://localhost:5000/api
 * For Physical Device: Use your computer's IP address (e.g., http://192.168.1.100:5000/api)
 * 
 * To find your computer's IP:
 * - Windows: Run `ipconfig` in CMD and look for IPv4 Address
 * - Mac/Linux: Run `ifconfig` or `ip addr` and look for your network interface IP
 */

// Default API base URL - UPDATE THIS FOR YOUR SETUP
const DEFAULT_API_URL = 'http://localhost:5000/api';

// Platform-specific URLs
const getApiBaseUrl = (): string => {
  // Check if there's an environment variable or config override
  // You can create a .env file or use React Native Config
  const envUrl = process.env.API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Platform detection
  if (Platform.OS === 'android') {
    // Android Emulator uses 10.0.2.2 to access host machine's localhost
    // For physical Android device, use your computer's IP address
    // Updated to use IP: 192.168.1.11
    return 'http://192.168.0.109:5000/api';
  } else if (Platform.OS === 'ios') {
    // iOS Simulator can use localhost
    // For physical iOS device, use your computer's IP address
    // Updated to use IP: 192.168.1.11
    return 'http://192.168.1.11:5000/api';
  }

  // Fallback
  return DEFAULT_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL in development for debugging
if (__DEV__) {
  console.log('📱 API Base URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
}

export default API_BASE_URL;

