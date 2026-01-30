import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as uploadApi from '../../services/upload';
import { API_BASE_URL } from '../../config/api';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DoctorVerificationUploadScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export const DoctorVerificationUploadScreen = () => {
  const navigation = useNavigation<DoctorVerificationUploadScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload files.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true, // Allow multiple file selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Validate file count (max 5)
        const totalFiles = selectedFiles.length + result.assets.length;
        if (totalFiles > 5) {
          Alert.alert('Error', 'Maximum 5 files allowed. Please remove some files first.');
          return;
        }

        // Validate file types and sizes
        const validFiles: SelectedFile[] = [];
        const invalidFiles: string[] = [];

        result.assets.forEach((asset) => {
          // Debug: Log asset properties to understand the structure
          if (__DEV__) {
            console.log('📸 Selected Asset:', {
              uri: asset.uri?.substring(0, 50) + '...',
              type: asset.type,
              mimeType: asset.mimeType,
              fileSize: asset.fileSize,
              width: asset.width,
              height: asset.height,
            });
          }

          // Get file name and extension
          const fileName = asset.uri.split('/').pop() || 'image.jpg';
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          
          // Map extensions to MIME types for FormData
          const extensionToMimeType: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'heic': 'image/jpeg', // Convert HEIC to JPEG for backend compatibility
            'heif': 'image/jpeg', // Convert HEIF to JPEG for backend compatibility
          };

          // Determine MIME type for FormData
          // Priority: asset.mimeType > asset.type > infer from extension > default to image/jpeg
          let mimeType = 'image/jpeg'; // Default
          
          if (asset.mimeType && asset.mimeType.startsWith('image/')) {
            mimeType = asset.mimeType;
          } else if (asset.type && (asset.type.startsWith('image/') || asset.type === 'image')) {
            // If asset.type is 'image' or 'image/...', use it or infer
            mimeType = asset.type.startsWith('image/') ? asset.type : extensionToMimeType[fileExtension] || 'image/jpeg';
          } else {
            // Infer from file extension
            mimeType = extensionToMimeType[fileExtension] || 'image/jpeg';
          }
          
          // Since we're using MediaTypeOptions.Images, all selected files are images
          // No need to validate file type - only validate size
          
          // Check file size (max 5MB) - asset.fileSize is in bytes
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            invalidFiles.push(`${fileName}: File size must be less than 5MB (current: ${(asset.fileSize / 1024 / 1024).toFixed(2)}MB)`);
            return;
          }

          validFiles.push({
            uri: asset.uri,
            name: fileName,
            type: mimeType,
            size: asset.fileSize,
          });
        });

        if (invalidFiles.length > 0) {
          invalidFiles.forEach((msg) => {
            Toast.show({
              type: 'error',
              text1: 'Invalid File',
              text2: msg,
            });
          });
        }

        if (validFiles.length > 0) {
          setSelectedFiles([...selectedFiles, ...validFiles]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select at least one file to upload');
      return;
    }

    setLoading(true);
    let tempFileUris: string[] = [];

    try {
      // Helper to get MIME type and filename
      const getMimeAndName = (file: SelectedFile, index: number) => {
        const fileName = file.name || `image-${Date.now()}-${index}.jpg`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mime =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const name = fileName.includes('.') ? fileName : `image-${Date.now()}-${index}.${ext}`;
        return { mime, name };
      };

      // Copy each image to cache (file://). Android cannot read content://; axios FormData → ERR_NETWORK.
      const copied = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const { mime, name } = getMimeAndName(file, index);
          const fileUri = await copyImageToCacheUri(file.uri, index, mime);
          tempFileUris.push(fileUri);
          return { uri: fileUri, mime, name };
        })
      );

      if (__DEV__) {
        console.log('📤 Uploading', copied.length, 'file(s) via XMLHttpRequest');
        console.log('📤 Full API URL:', `${API_BASE_URL}/upload/doctor-docs`);
      }

      // Upload using XMLHttpRequest (handles file:// URIs correctly)
      const response = await uploadApi.uploadDoctorDocs(copied);

      // Check response - backend returns { success: true, message: '...', data: { urls: [...] } }
      // Since interceptor extracts response.data, response is already the data object
      if (response?.success || response?.data?.urls || response?.urls) {
        // Mark documents as submitted to prevent navigation back to upload screen
        // Set this BEFORE navigation to ensure it's saved
        await AsyncStorage.setItem('doctor_documents_submitted', 'true');
        
        if (__DEV__) {
          const flag = await AsyncStorage.getItem('doctor_documents_submitted');
          console.log('✅ Documents submitted flag set:', flag);
        }

        Toast.show({
          type: 'success',
          text1: 'Documents Uploaded',
          text2: 'Verification documents uploaded successfully! Your documents are under review.',
        });

        // Use reset instead of replace to clear navigation stack and prevent going back
        // Reset immediately (no setTimeout) to prevent any race conditions
        navigation.reset({
          index: 0,
          routes: [{ name: 'PendingApproval' }],
        });
      } else {
        throw new Error(response?.message || 'Upload failed: Invalid response');
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to upload documents. Please try again.';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map((e: any) => e.message || e).join(', ');
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }
      
      // Check for network errors - provide helpful message
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMessage = `Network Error - Cannot connect to backend.

Current API URL: ${API_BASE_URL}

Please check:
1. Backend server is running (check terminal/console)
2. Backend is accessible at: ${API_BASE_URL.replace('/api', '')}
3. If using physical device, ensure IP address in config/api.ts matches your computer's IP
4. If using emulator:
   - Android: Use http://10.0.2.2:5000/api
   - iOS: Use http://localhost:5000/api

To find your computer's IP:
- Windows: Run 'ipconfig' in CMD
- Mac/Linux: Run 'ifconfig' or 'ip addr'`;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: errorMessage,
        visibilityTime: 5000,
      });
    } finally {
      // Clean up temp files
      if (tempFileUris.length > 0) {
        await deleteCacheFiles(tempFileUris);
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="medical" size={60} color={colors.primary} />
          </View>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.step,
                  step === 4 ? styles.stepActive : styles.stepDone,
                ]}
              >
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Doctor Verification</Text>
          <Text style={styles.subtitle}>
            Please upload your verification documents. You can upload up to 5 files.
            {'\n'}
            <Text style={styles.subtitleSmall}>
              Accepted formats: JPEG, PNG, WebP (Max 5MB per file)
            </Text>
          </Text>

          {/* Required Documents List */}
          <View style={styles.verifyBox}>
            <Text style={styles.verifyBoxTitle}>Required Documents:</Text>
            <View style={styles.verifyList}>
              <Text style={styles.verifyItem}>
                • Certificate of Registration with the Medical Council
              </Text>
              <Text style={styles.verifyItem}>
                • Certificate of Good Standing (valid for 3 months from date of issue)
              </Text>
              <Text style={styles.verifyItem}>• Curriculum Vitae</Text>
              <Text style={styles.verifyItem}>
                • Specialist Registration Certificate (if applicable)
              </Text>
              <Text style={styles.verifyItem}>
                • Digital signature: copy of the signature and registration number (if applicable)
              </Text>
            </View>
          </View>

          {/* File Upload */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>
              Upload Verification Documents <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.labelHint}>
              (Select multiple files - Max 5 files, 5MB each)
            </Text>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImages}
              disabled={selectedFiles.length >= 5}
            >
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected`
                  : 'Click to select files (JPEG, PNG, WebP)'}
              </Text>
              {selectedFiles.length >= 5 && (
                <Text style={styles.uploadLimitText}>Maximum 5 files reached</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <View style={styles.filesPreview}>
              <Text style={styles.label}>Selected Files:</Text>
              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <Image source={{ uri: file.uri }} style={styles.filePreview} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    {file.size && (
                      <Text style={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFile(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Button
            title={loading ? 'Uploading...' : 'Submit for Verification'}
            onPress={handleSubmit}
            loading={loading}
            disabled={selectedFiles.length === 0}
            style={styles.submitButton}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Try to go back, if no previous screen, navigate to Register
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Register');
              }
            }}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Previous Step</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.primaryLight,
  },
  logoContainer: {
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 12,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: colors.primary,
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.textWhite,
  },
  stepText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitleSmall: {
    fontSize: 12,
  },
  verifyBox: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  verifyList: {
    gap: 8,
  },
  verifyItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  required: {
    color: colors.error,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  uploadLimitText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  filesPreview: {
    marginBottom: 24,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filePreview: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
