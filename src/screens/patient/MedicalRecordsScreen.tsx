import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as medicalRecordsApi from '../../services/medicalRecords';
import * as uploadApi from '../../services/upload';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

type MedicalRecordsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const defaultAvatar = require('../../../assets/avatar.png');

/**
 * Normalize image URL for mobile app
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.0.114';
  }
  
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

export const MedicalRecordsScreen = () => {
  const navigation = useNavigation<MedicalRecordsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'medical' | 'prescription'>('medical');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewRecord, setViewRecord] = useState<medicalRecordsApi.MedicalRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state for adding new record
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recordType: 'OTHER' as medicalRecordsApi.RecordType,
    file: null as any,
    fileName: '',
    fileSize: 0,
  });
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Determine record type filter based on active tab
  const recordTypeFilter = useMemo(() => {
    return activeTab === 'prescription' ? 'PRESCRIPTION' : undefined;
  }, [activeTab]);

  // Fetch medical records
  const {
    data: recordsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['medicalRecords', recordTypeFilter, currentPage],
    queryFn: () =>
      medicalRecordsApi.getMedicalRecords({
        recordType: recordTypeFilter,
        page: currentPage,
        limit: 20,
      }),
    keepPreviousData: true,
  });

  // Extract records and pagination
  const recordsData = recordsResponse?.data || recordsResponse;
  const records = recordsData?.records || [];
  const pagination = recordsData?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  // Filter records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(
      (record) =>
        record.title?.toLowerCase().includes(query) ||
        record.description?.toLowerCase().includes(query) ||
        record.fileName?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  // Create medical record mutation
  const createRecordMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      recordType: medicalRecordsApi.RecordType;
      file: any;
    }) => {
      // First upload the file
      if (data.file) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', {
          uri: data.file.uri,
          type: data.file.mimeType || 'application/octet-stream',
          name: data.file.name || 'file',
        } as any);

        const fileUrl = await uploadApi.uploadGeneralFile(uploadFormData);
        
        // Then create the medical record
        return medicalRecordsApi.createMedicalRecord({
          title: data.title,
          description: data.description || undefined,
          recordType: data.recordType,
          fileUrl: fileUrl,
          fileName: data.file.name || undefined,
          fileSize: data.file.size || undefined,
        });
      } else {
        throw new Error('File is required');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['medicalRecords']);
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        recordType: 'OTHER',
        file: null,
        fileName: '',
        fileSize: 0,
      });
      setFilePreview(null);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Medical record created successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create medical record';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Delete medical record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: (recordId: string) => medicalRecordsApi.deleteMedicalRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries(['medicalRecords']);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Medical record deleted successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete medical record';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Handle tab change
  const handleTabChange = (tab: 'medical' | 'prescription') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Handle file picker
  const handlePickFile = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your files.');
        return;
      }

      // Show action sheet
      Alert.alert(
        'Select File',
        'Choose file source',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setFormData((prev) => ({
                  ...prev,
                  file: {
                    uri: asset.uri,
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    type: asset.type || 'image/jpeg',
                    size: asset.fileSize || 0,
                  },
                  fileName: asset.fileName || `image_${Date.now()}.jpg`,
                  fileSize: asset.fileSize || 0,
                }));
                setFilePreview(asset.uri);
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setFormData((prev) => ({
                  ...prev,
                  file: {
                    uri: asset.uri,
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    type: asset.type || 'image/jpeg',
                    size: asset.fileSize || 0,
                  },
                  fileName: asset.fileName || `image_${Date.now()}.jpg`,
                  fileSize: asset.fileSize || 0,
                }));
                setFilePreview(asset.uri);
              }
            },
          },
          {
            text: 'Document',
            onPress: async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                // Validate file size (10 MB)
                if (asset.size && asset.size > 10 * 1024 * 1024) {
                  Toast.show({
                    type: 'error',
                    text1: 'File Too Large',
                    text2: 'File size must be less than 10 MB',
                  });
                  return;
                }

                setFormData((prev) => ({
                  ...prev,
                  file: {
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream',
                    size: asset.size || 0,
                  },
                  fileName: asset.name,
                  fileSize: asset.size || 0,
                }));
                setFilePreview(null);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to pick file',
      });
    }
  };

  // Handle form submit
  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Title is required',
      });
      return;
    }
    if (!formData.file) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'File is required',
      });
      return;
    }
    createRecordMutation.mutate(formData);
  };

  // Handle delete
  const handleDelete = (recordId: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this medical record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRecordMutation.mutate(recordId),
      },
    ]);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get record type badge color
  const getRecordTypeBadgeColor = (type: medicalRecordsApi.RecordType) => {
    const colorsMap: Record<medicalRecordsApi.RecordType, string> = {
      PRESCRIPTION: colors.primary,
      LAB_REPORT: colors.info || colors.primary,
      TEST_RESULT: colors.success,
      IMAGE: colors.warning,
      PDF: colors.error,
      OTHER: colors.textSecondary,
    };
    return colorsMap[type] || colors.textSecondary;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderRecordItem = ({ item: record }: { item: medicalRecordsApi.MedicalRecord }) => {
    const recordId = `#${record._id.slice(-6).toUpperCase()}`;
    const doctorName =
      record.relatedDoctorId && typeof record.relatedDoctorId === 'object' && record.relatedDoctorId !== null
        ? record.relatedDoctorId.fullName || 'Unknown Doctor'
        : record.relatedDoctorId
        ? 'Unknown Doctor'
        : 'Self';
    const doctorImage =
      record.relatedDoctorId && typeof record.relatedDoctorId === 'object' && record.relatedDoctorId !== null
        ? record.relatedDoctorId.profileImage
        : null;
    const normalizedImageUrl = normalizeImageUrl(doctorImage);
    const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.recordIcon}>
            <Ionicons
              name={activeTab === 'prescription' ? 'document-text' : 'medical'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordId}>{recordId}</Text>
            <Text style={styles.recordName}>{record.title}</Text>
            <Text style={styles.recordDate}>{formatDate(record.uploadedDate || record.createdAt)}</Text>
            {activeTab === 'medical' && (
              <View style={styles.recordTypeBadge}>
                <View style={[styles.badge, { backgroundColor: getRecordTypeBadgeColor(record.recordType) }]}>
                  <Text style={styles.badgeText}>{record.recordType?.replace('_', ' ') || 'OTHER'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
        {activeTab === 'prescription' && (
          <View style={styles.doctorInfo}>
            <Image source={imageSource} style={styles.doctorImage} defaultSource={defaultAvatar} />
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorLabel}>Prescribed By</Text>
              <Text style={styles.doctorName}>{doctorName}</Text>
            </View>
          </View>
        )}
        {activeTab === 'medical' && record.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {record.description}
            </Text>
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.viewButton} onPress={() => setViewRecord(record)}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => {
              const fileUrl = normalizeImageUrl(record.fileUrl);
              if (fileUrl) {
                // In React Native, you might want to use Linking.openURL or a file viewer
                Alert.alert('Download', 'File download functionality would open here');
              }
            }}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(record._id)}
            disabled={deleteRecordMutation.isLoading}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medical' && styles.activeTab]}
          onPress={() => handleTabChange('medical')}
        >
          <Text style={[styles.tabText, activeTab === 'medical' && styles.activeTabText]}>
            Medical Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescription' && styles.activeTab]}
          onPress={() => handleTabChange('prescription')}
        >
          <Text style={[styles.tabText, activeTab === 'prescription' && styles.activeTabText]}>
            Prescriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar and Add Button */}
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {activeTab === 'medical' && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color={colors.textWhite} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={activeTab === 'prescription' ? 'document-text-outline' : 'medical-outline'}
            size={64}
            color={colors.textLight}
          />
          <Text style={styles.emptyText}>
            {activeTab === 'prescription' ? 'No prescriptions found' : 'No medical records found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item._id}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                    Prev
                  </Text>
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  Page {currentPage} of {pagination.pages}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === pagination.pages && styles.paginationButtonDisabled]}
                  onPress={() => currentPage < pagination.pages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === pagination.pages && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Add Medical Record Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medical Record</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Input
                label="Title *"
                placeholder="Enter record title"
                value={formData.title}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                style={styles.modalInput}
              />
              <Input
                label="Description"
                placeholder="Enter description (optional)"
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                style={styles.modalInput}
              />
              <View style={styles.modalInput}>
                <Text style={styles.inputLabel}>Record Type *</Text>
                <View style={styles.recordTypeContainer}>
                  {(['PRESCRIPTION', 'LAB_REPORT', 'TEST_RESULT', 'IMAGE', 'PDF', 'OTHER'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.recordTypeOption,
                        formData.recordType === type && styles.recordTypeOptionActive,
                      ]}
                      onPress={() => setFormData((prev) => ({ ...prev, recordType: type }))}
                    >
                      <Text
                        style={[
                          styles.recordTypeOptionText,
                          formData.recordType === type && styles.recordTypeOptionTextActive,
                        ]}
                      >
                        {type.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.modalInput}>
                <Text style={styles.inputLabel}>File *</Text>
                <TouchableOpacity style={styles.filePickerButton} onPress={handlePickFile}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                  <Text style={styles.filePickerButtonText}>
                    {formData.file ? formData.fileName : 'Choose File'}
                  </Text>
                </TouchableOpacity>
                {formData.file && (
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileInfoText}>
                      {formData.fileName} ({(formData.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  </View>
                )}
                {filePreview && (
                  <Image source={{ uri: filePreview }} style={styles.filePreview} resizeMode="contain" />
                )}
                <Text style={styles.fileHint}>Max file size: 10 MB</Text>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                style={styles.cancelButton}
                textStyle={styles.cancelButtonText}
                variant="secondary"
              />
              <Button
                title={createRecordMutation.isLoading ? 'Uploading...' : 'Add Record'}
                onPress={handleSubmit}
                style={styles.submitButton}
                disabled={createRecordMutation.isLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* View Record Modal */}
      {viewRecord && (
        <Modal visible={!!viewRecord} transparent animationType="slide" onRequestClose={() => setViewRecord(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{viewRecord.title}</Text>
                <TouchableOpacity onPress={() => setViewRecord(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.viewRecordItem}>
                  <Text style={styles.viewRecordLabel}>Type:</Text>
                  <View style={[styles.badge, { backgroundColor: getRecordTypeBadgeColor(viewRecord.recordType) }]}>
                    <Text style={styles.badgeText}>{viewRecord.recordType?.replace('_', ' ') || 'OTHER'}</Text>
                  </View>
                </View>
                {viewRecord.description && (
                  <View style={styles.viewRecordItem}>
                    <Text style={styles.viewRecordLabel}>Description:</Text>
                    <Text style={styles.viewRecordText}>{viewRecord.description}</Text>
                  </View>
                )}
                <View style={styles.viewRecordItem}>
                  <Text style={styles.viewRecordLabel}>Uploaded Date:</Text>
                  <Text style={styles.viewRecordText}>{formatDate(viewRecord.uploadedDate || viewRecord.createdAt)}</Text>
                </View>
                {viewRecord.fileName && (
                  <View style={styles.viewRecordItem}>
                    <Text style={styles.viewRecordLabel}>File Name:</Text>
                    <Text style={styles.viewRecordText}>{viewRecord.fileName}</Text>
                  </View>
                )}
                {viewRecord.fileUrl && (
                  <View style={styles.viewRecordItem}>
                    <TouchableOpacity
                      style={styles.downloadButtonLarge}
                      onPress={() => {
                        const fileUrl = normalizeImageUrl(viewRecord.fileUrl);
                        if (fileUrl) {
                          Alert.alert('Download', 'File download functionality would open here');
                        }
                      }}
                    >
                      <Ionicons name="download-outline" size={20} color={colors.textWhite} />
                      <Text style={styles.downloadButtonLargeText}>View/Download File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <Button title="Close" onPress={() => setViewRecord(null)} style={styles.closeButton} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.textWhite,
  },
  headerContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 16,
  },
  recordCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordTypeBadge: {
    marginTop: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  doctorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  descriptionContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorLight || colors.backgroundLight,
    paddingVertical: 10,
    borderRadius: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationText: {
    fontSize: 14,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalInput: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  recordTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recordTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordTypeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recordTypeOptionText: {
    fontSize: 12,
    color: colors.text,
  },
  recordTypeOptionTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  filePickerButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  fileInfo: {
    marginTop: 8,
  },
  fileInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filePreview: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderRadius: 8,
  },
  fileHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: colors.text,
  },
  submitButton: {
    flex: 1,
  },
  closeButton: {
    flex: 1,
  },
  viewRecordItem: {
    marginBottom: 16,
  },
  viewRecordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  viewRecordText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonLargeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
