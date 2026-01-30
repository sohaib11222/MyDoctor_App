import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../config/api';
import api from './api';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

export interface ProductImageFile {
  uri: string;
  mime: string;
  name: string;
}

export const uploadPharmacyLogo = async (file: ProductImageFile): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }

    const url = `${API_BASE_URL}/upload/pharmacy`;
    if (__DEV__) {
      console.log('🔗 Pharmacy Logo Upload (XMLHttpRequest):', url);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bodyData = JSON.parse(xhr.responseText);
            resolve(bodyData);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${xhr.responseText}`));
          }
        } else {
          let errData: any = { message: `Upload failed: HTTP ${xhr.status}` };
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errData = parsed;
          } catch {
            if (xhr.responseText) errData = { message: xhr.responseText };
          }
          const err = new Error(errData?.message || `Upload failed: HTTP ${xhr.status}`) as any;
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload') as any;
        err.code = 'ERR_NETWORK';
        reject(err);
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout after 60 seconds'));
      };

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mime,
        name: file.name,
      } as any);

      xhr.send(formData as any);
    });
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Pharmacy logo upload error:', {
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
 * Upload doctor verification documents
 * @param {FormData} formData - FormData containing files (field name should be 'files')
 * @returns {Promise<any>} Upload response with file URLs
 */
/**
 * Upload doctor verification documents using XMLHttpRequest.
 * Works with Expo without requiring native modules.
 * Uses file:// URIs from copyImageToCacheUri (already copied from content://).
 *
 * @param files - Array of { uri, mime, name } (use file:// URIs from copyImageToCacheUri)
 * @returns {Promise<any>} Upload response
 */
export const uploadDoctorDocs = async (files: ProductImageFile[]): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }

    const url = `${API_BASE_URL}/upload/doctor-docs`;
    if (__DEV__) {
      console.log('🔗 Doctor Docs Upload (XMLHttpRequest):', url);
      console.log('🔗 Files count:', files.length);
      try {
        const pre = await fetch(`${API_BASE_URL}/health`);
        console.log('🔗 Preflight GET /health:', pre.ok ? 'OK' : pre.status);
      } catch (e: any) {
        console.warn('🔗 Preflight GET /health failed:', e?.message);
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bodyData = JSON.parse(xhr.responseText);
            resolve(bodyData);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${xhr.responseText}`));
          }
        } else {
          let errData: any = { message: `Upload failed: HTTP ${xhr.status}` };
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errData = parsed;
          } catch {
            if (xhr.responseText) errData = { message: xhr.responseText };
          }
          const err = new Error(errData?.message || `Upload failed: HTTP ${xhr.status}`) as any;
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload') as any;
        err.code = 'ERR_NETWORK';
        reject(err);
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout after 60 seconds'));
      };

      const formData = new FormData();
      files.forEach((f) => {
        formData.append('files', {
          uri: f.uri,
          type: f.mime,
          name: f.name,
        } as any);
      });

      xhr.send(formData as any);
    });
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Doctor docs upload error:', {
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
 * Upload profile image
 * @param {FormData} formData - FormData containing file (field name should be 'file')
 * @returns {Promise<any>} Upload response with file URL
 */
/**
 * Upload profile image using XMLHttpRequest.
 * Works with Expo without requiring native modules.
 * Uses file:// URI from copyImageToCacheUri (already copied from content://).
 *
 * @param file - { uri, mime, name } (use file:// URI from copyImageToCacheUri)
 * @returns {Promise<any>} Upload response with file URL
 */
export const uploadProfileImage = async (file: ProductImageFile): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }

    const url = `${API_BASE_URL}/upload/profile`;
    if (__DEV__) {
      console.log('🔗 Profile Image Upload (XMLHttpRequest):', url);
      try {
        const pre = await fetch(`${API_BASE_URL}/health`);
        console.log('🔗 Preflight GET /health:', pre.ok ? 'OK' : pre.status);
      } catch (e: any) {
        console.warn('🔗 Preflight GET /health failed:', e?.message);
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bodyData = JSON.parse(xhr.responseText);
            resolve(bodyData);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${xhr.responseText}`));
          }
        } else {
          let errData: any = { message: `Upload failed: HTTP ${xhr.status}` };
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errData = parsed;
          } catch {
            if (xhr.responseText) errData = { message: xhr.responseText };
          }
          const err = new Error(errData?.message || `Upload failed: HTTP ${xhr.status}`) as any;
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload') as any;
        err.code = 'ERR_NETWORK';
        reject(err);
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout after 60 seconds'));
      };

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mime,
        name: file.name,
      } as any);

      xhr.send(formData as any);
    });
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Profile image upload error:', {
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
 * Upload product images (multiple files) using XMLHttpRequest.
 * Works with Expo without requiring native modules.
 * Uses file:// URIs from copyImageToCacheUri (already copied from content://).
 *
 * @param files - Array of { uri, mime, name } (use file:// URIs from copyImageToCacheUri)
 * @returns {Promise<string[]>} Array of uploaded image URLs
 */
export const uploadProductImages = async (files: ProductImageFile[]): Promise<string[]> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }

    const url = `${API_BASE_URL}/upload/product`;
    if (__DEV__) {
      console.log('🔗 Product Images Upload (XMLHttpRequest):', url);
      console.log('🔗 Files count:', files.length);
      try {
        const pre = await fetch(`${API_BASE_URL}/health`);
        console.log('🔗 Preflight GET /health:', pre.ok ? 'OK' : pre.status);
      } catch (e: any) {
        console.warn('🔗 Preflight GET /health failed:', e?.message, '- device may not reach API.');
      }
    }

    // Use XMLHttpRequest for multipart upload (more reliable than fetch/axios in RN)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bodyData = JSON.parse(xhr.responseText);
            const data = bodyData?.data ?? bodyData;

            if (data?.urls && Array.isArray(data.urls)) {
              resolve(data.urls);
            } else if (data?.url) {
              resolve([data.url]);
            } else if (Array.isArray(data)) {
              resolve(data);
            } else {
              resolve([]);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${xhr.responseText}`));
          }
        } else {
          let errData: any = { message: `Upload failed: HTTP ${xhr.status}` };
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errData = parsed;
          } catch {
            if (xhr.responseText) errData = { message: xhr.responseText };
          }
          const err = new Error(errData?.message || `Upload failed: HTTP ${xhr.status}`) as any;
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload') as any;
        err.code = 'ERR_NETWORK';
        reject(err);
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout after 60 seconds'));
      };

      // Build FormData with file:// URIs
      const formData = new FormData();
      files.forEach((f) => {
        // Use file:// URI directly - XMLHttpRequest handles it better than axios
        formData.append('files', {
          uri: f.uri,
          type: f.mime,
          name: f.name,
        } as any);
      });

      xhr.send(formData as any);
    });
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
 * Upload chat file (supports all file types including images)
 * @param file - { uri, mime, name } (use file:// URI from copyImageToCacheUri)
 * @returns {Promise<any>} Upload response with file URL
 */
export const uploadChatFile = async (file: ProductImageFile): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not defined. Please check config/api.ts');
    }

    const url = `${API_BASE_URL}/upload/chat`;
    if (__DEV__) {
      console.log('🔗 Chat File Upload (XMLHttpRequest):', url);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bodyData = JSON.parse(xhr.responseText);
            resolve(bodyData);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${xhr.responseText}`));
          }
        } else {
          let errData: any = { message: `Upload failed: HTTP ${xhr.status}` };
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.message) errData = parsed;
          } catch {
            if (xhr.responseText) errData = { message: xhr.responseText };
          }
          const err = new Error(errData?.message || `Upload failed: HTTP ${xhr.status}`) as any;
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload') as any;
        err.code = 'ERR_NETWORK';
        reject(err);
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout after 60 seconds'));
      };

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mime,
        name: file.name,
      } as any);

      xhr.send(formData as any);
    });
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Chat file upload error:', {
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

