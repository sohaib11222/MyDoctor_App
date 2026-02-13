import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as chatApi from '../../services/chat';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as uploadApi from '../../services/upload';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import { useTranslation } from 'react-i18next';

type ChatDetailScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'ChatDetail'>;
type ChatDetailRouteProp = RouteProp<ChatStackParamList, 'ChatDetail'>;

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  sender: string;
  senderAvatar: any; // Changed to any for require() images
  message: string;
  time: string;
  isSent: boolean;
  isRead?: boolean;
  type?: 'text' | 'audio' | 'image' | 'file' | 'location' | 'video';
  audioDuration?: string;
  images?: string[];
  fileInfo?: {
    name: string;
    type: string;
  };
}

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
    deviceHost = match ? match[1] : '192.168.1.11';
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

/**
 * Format date to time string
 */
const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/**
 * Format date for separator
 */
const formatDate = (
  dateString: string,
  t: (key: string, options?: any) => string
): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return t('chat.date.today');
  } else if (date.toDateString() === yesterday.toDateString()) {
    return t('chat.date.yesterday');
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const ChatDetailScreen = () => {
  const navigation = useNavigation<ChatDetailScreenNavigationProp>();
  const route = useRoute<ChatDetailRouteProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { recipientName, chatId, conversationId, appointmentId, patientId, doctorId } = route.params;
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{ 
    uri: string; 
    name: string; 
    type: string; 
    mime: string;
    size?: number;
    isImage: boolean;
  }>>([]);
  const [imagePreview, setImagePreview] = useState<{
    visible: boolean;
    images: string[];
    currentIndex: number;
  }>({
    visible: false,
    images: [],
    currentIndex: 0,
  });
  const flatListRef = useRef<FlatList>(null);

  // For patients: Get or create conversation first if conversationId is not set
  const {
    data: patientConversationData,
    isLoading: patientConversationLoading,
    error: patientConversationError,
    refetch: refetchPatientConversation,
  } = useQuery({
    queryKey: ['patientConversation', doctorId, appointmentId, user?.id],
    queryFn: async () => {
      if (!isDoctor && doctorId && appointmentId && user?.id) {
        return await chatApi.startConversationWithDoctor(doctorId, appointmentId, user.id);
      }
      return null;
    },
    enabled: !!(isDoctor === false && doctorId && appointmentId && user?.id && !conversationId),
    retry: 1,
  });

  // For doctors: Get or create conversation first if conversationId is not set
  const {
    data: doctorConversationData,
    isLoading: doctorConversationLoading,
    error: doctorConversationError,
    refetch: refetchDoctorConversation,
  } = useQuery({
    queryKey: ['doctorConversation', user?.id, patientId, appointmentId],
    queryFn: async () => {
      if (isDoctor && user?.id && patientId && appointmentId) {
        return await chatApi.startConversationWithPatient(
          user.id,
          patientId,
          appointmentId
        );
      }
      return null;
    },
    enabled: !!(isDoctor && user?.id && patientId && appointmentId && !conversationId),
    retry: 1,
  });

  // Update conversationId if we got it from the API
  const conversationData = isDoctor ? doctorConversationData : patientConversationData;
  const conversationLoading = isDoctor ? doctorConversationLoading : patientConversationLoading;
  const conversationSetupError = isDoctor ? doctorConversationError : patientConversationError;
  const actualConversationId = conversationId || conversationData?.data?._id || chatId;

  // Check if we have the required parameters
  const hasRequiredParams = isDoctor 
    ? (!!patientId && !!appointmentId)
    : (!!doctorId && !!appointmentId);

  // Fetch conversation details to get recipient info (if conversationId exists but we don't have data)
  const { data: conversationDetailsResponse } = useQuery({
    queryKey: ['conversationDetails', actualConversationId],
    queryFn: async () => {
      if (!actualConversationId || conversationData?.data) return null;
      // Try to get conversation from messages or use a separate endpoint if available
      return null; // Will use messages to get recipient info
    },
    enabled: !!actualConversationId && !conversationData?.data,
    retry: 1,
  });

  // Fetch messages for conversation
  const { data: messagesResponse, isLoading: messagesLoading, error, refetch } = useQuery({
    queryKey: ['conversationMessages', actualConversationId],
    queryFn: () => {
      if (!actualConversationId) {
        throw new Error(t('chat.admin.conversationIdNotFound'));
      }
      return chatApi.getMessages(actualConversationId, { page: 1, limit: 100 });
    },
    enabled: !!actualConversationId && hasRequiredParams,
    retry: 1,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Get recipient profile image from conversation data or messages
  const recipientProfileImage = useMemo(() => {
    // First try to get from conversation data
    if (conversationData?.data) {
      const conv = conversationData.data;
      if (isDoctor) {
        // Doctor viewing patient
        return conv.patientId?.profileImage || null;
      } else {
        // Patient viewing doctor
        return conv.doctorId?.profileImage || null;
      }
    }
    
    // If not available, try to get from first message's sender (if it's not the current user)
    if (messagesResponse?.data?.messages && messagesResponse.data.messages.length > 0) {
      const firstMessage = messagesResponse.data.messages[0];
      if (firstMessage.senderId && firstMessage.senderId._id !== user?.id) {
        return firstMessage.senderId.profileImage || null;
      }
      // If first message is from current user, find a message from the recipient
      const recipientMessage = messagesResponse.data.messages.find(
        (msg: any) => msg.senderId && msg.senderId._id !== user?.id
      );
      if (recipientMessage?.senderId?.profileImage) {
        return recipientMessage.senderId.profileImage;
      }
    }
    
    return null;
  }, [conversationData, messagesResponse, isDoctor, user?.id]);

  const isLoading = messagesLoading || conversationLoading;
  
  // Check if we're still waiting for conversation to be created
  const isWaitingForConversation = !actualConversationId && hasRequiredParams && !conversationLoading && !conversationSetupError;

  useEffect(() => {
    if (!conversationSetupError) return;

    const status = (conversationSetupError as any)?.response?.status;
    const backendMessage =
      (conversationSetupError as any)?.response?.data?.message ||
      (conversationSetupError as any)?.message ||
      t('chat.detail.unableToOpenChat');

    if (status === 403) {
      Alert.alert(t('chat.list.chatNotAvailableTitle'), backendMessage, [
        {
          text: t('common.ok'),
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
          },
        },
      ]);
    }
  }, [conversationSetupError, navigation, t]);

  // Transform backend messages to UI format
  const messages = useMemo(() => {
    if (!messagesResponse?.data?.messages) return [];
    
    return messagesResponse.data.messages.map((msg: chatApi.ChatMessage): Message => {
      const isSent = msg.senderId._id === user?.id;
      const senderName = msg.senderId.fullName || t('chat.common.unknown');
      const senderImage = msg.senderId.profileImage;
      
      // Determine message type based on attachments
      let messageType: 'text' | 'audio' | 'image' | 'file' | 'location' | 'video' = 'text';
      let images: string[] | undefined;
      let fileInfo: { name: string; type: string } | undefined;
      
      if (msg.attachments && msg.attachments.length > 0) {
        // Handle both string URLs and object attachments
        const firstAttachment = msg.attachments[0];
        const isObjectAttachment = typeof firstAttachment === 'object' && firstAttachment !== null;
        
        if (isObjectAttachment) {
          // New format: attachment is an object { type, url, name, size }
          const attObj = firstAttachment as any;
          const attType = attObj.type || 'file';
          const attUrl = attObj.url || '';
          
          if (attType === 'image') {
            messageType = 'image';
            images = msg.attachments.map((att: any) => {
              const url = typeof att === 'object' ? att.url : att;
              return normalizeImageUrl(url) || url;
            }).filter(Boolean) as string[];
          } else {
            messageType = 'file';
            fileInfo = {
              name: attObj.name || 'file',
              type: (attObj.name || '').split('.').pop()?.toLowerCase() || 'file',
            };
          }
        } else {
          // Old format: attachment is a string URL
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
          const attachmentUrl = String(firstAttachment);
          const fileExtension = attachmentUrl.split('.').pop()?.toLowerCase() || '';
          const isImage = imageExtensions.includes(fileExtension);
          
          if (isImage) {
            messageType = 'image';
            images = msg.attachments.map((att: any) => {
              const url = typeof att === 'object' ? att.url : String(att);
              return normalizeImageUrl(url) || url;
            }).filter(Boolean) as string[];
          } else {
            messageType = 'file';
            // Extract filename from URL
            const fileName = attachmentUrl.split('/').pop() || 'file';
            fileInfo = {
              name: fileName,
              type: fileExtension,
            };
          }
        }
      }
      
      // Normalize sender image URL
      // If sender is current user and message doesn't have profile image, use user's profile image
      let finalSenderImage = senderImage;
      if (isSent && !senderImage && user?.profileImage) {
        finalSenderImage = user.profileImage;
      }
      
      let senderAvatarSource = defaultAvatar;
      if (finalSenderImage) {
        const normalizedUrl = normalizeImageUrl(finalSenderImage);
        if (normalizedUrl) {
          senderAvatarSource = { uri: normalizedUrl };
        }
      }
      
      return {
        id: msg._id,
        sender: senderName,
        senderAvatar: senderAvatarSource,
        message: msg.message || '',
        time: formatTime(msg.createdAt),
        isSent,
        isRead: msg.isRead,
        type: messageType,
        images,
        fileInfo,
      };
    });
  }, [messagesResponse, t, user?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!user) throw new Error(t('chat.send.failedFallback'));
      
      if (isDoctor && patientId && appointmentId) {
        // Doctor sending to patient
        if (!user.id) throw new Error(t('chat.send.failedFallback'));
        return await chatApi.sendMessageToPatient(
          user.id,
          patientId,
          appointmentId,
          messageText
        );
      } else if (!isDoctor && doctorId && appointmentId) {
        // Patient sending to doctor
        return await chatApi.sendMessageToDoctor(
          doctorId,
          appointmentId,
          messageText,
          undefined,
          user.id
        );
      } else {
        throw new Error(t('chat.send.failedFallback'));
      }
    },
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['conversationMessages', actualConversationId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      await queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || t('chat.send.failedFallback');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: () => chatApi.markMessagesAsRead(actualConversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
    },
  });

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (actualConversationId) {
      markAsReadMutation.mutate();
    }
  }, [actualConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Handle file selection (images)
  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.show({
        type: 'error',
        text1: t('chat.permissions.requiredTitle'),
        text2: t('chat.permissions.photosBody'),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const oversizedFiles = result.assets.filter(asset => asset.fileSize && asset.fileSize > maxSize);
      
      if (oversizedFiles.length > 0) {
        Toast.show({
          type: 'error',
          text1: t('chat.files.fileTooLargeTitle'),
          text2: t('chat.files.fileTooLargeBody'),
        });
        return;
      }

      // Add files to pending list (don't upload yet)
      const newFiles = result.assets.map(asset => {
        const fileName = asset.fileName || `image-${Date.now()}.jpg`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const name = fileName.includes('.') ? fileName : `image-${Date.now()}.${ext}`;
        
        return {
          uri: asset.uri,
          name,
          type: 'image',
          mime,
          size: asset.fileSize,
          isImage: true,
        };
      });

      setPendingFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle document/file selection
  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const oversizedFiles = result.assets.filter(asset => asset.size && asset.size > maxSize);
        
        if (oversizedFiles.length > 0) {
          Toast.show({
            type: 'error',
            text1: t('chat.files.fileTooLargeTitle'),
            text2: t('chat.files.fileTooLargeBody'),
          });
          return;
        }

        // Add files to pending list (don't upload yet)
        const newFiles = result.assets.map(asset => {
          const fileName = asset.name || `file-${Date.now()}`;
          const mime = asset.mimeType || 'application/octet-stream';
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
          
          return {
            uri: asset.uri,
            name: fileName,
            type: isImage ? 'image' : 'file',
            mime,
            size: asset.size,
            isImage,
          };
        });

        setPendingFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error: any) {
      console.error('Error picking document:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('chat.files.failedToPickDocument'),
      });
    }
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload and send message with attachments
  const uploadAndSendFiles = async () => {
    if (pendingFiles.length === 0 && !message.trim()) {
      return;
    }

    setUploadingFiles(true);
    const uploadedAttachments: Array<{ type: string; url: string; name: string; size?: number }> = [];
    const filesToCleanup: string[] = [];

    try {
      // Upload all pending files
      for (const file of pendingFiles) {
        try {
          let fileUri = file.uri;
          
          // For images, copy to cache first
          if (file.isImage) {
            fileUri = await copyImageToCacheUri(file.uri, 0, file.mime);
            filesToCleanup.push(fileUri);
          }

          const uploadResponse = await uploadApi.uploadChatFile({ 
            uri: fileUri, 
            mime: file.mime, 
            name: file.name 
          });
          
          const fileUrl = uploadResponse?.data?.url || uploadResponse?.url;
          
          if (fileUrl) {
            // Ensure absolute URL
            const baseUrl = API_BASE_URL.replace('/api', '');
            const normalizedUrl = fileUrl.startsWith('http') 
              ? fileUrl 
              : `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
            
            // Add attachment as object (backend expects this format)
            uploadedAttachments.push({
              type: file.isImage ? 'image' : 'file',
              url: normalizedUrl,
              name: file.name,
              size: file.size,
            });
          }
        } catch (uploadError: any) {
          console.error('Error uploading file:', uploadError);
          const errorMsg =
            (uploadError as any)?.response?.data?.message ||
            uploadError?.message ||
            t('chat.files.uploadFailed');
          Toast.show({
            type: 'error',
            text1: t('chat.files.uploadFailedTitle'),
            text2: t('chat.files.failedToUploadNameWithError', { name: file.name, error: errorMsg }),
          });
        }
      }

      // Clean up temp files
      if (filesToCleanup.length > 0) {
        await deleteCacheFiles(filesToCleanup);
      }

      // Send message with attachments if any were uploaded, or send text message
      if (uploadedAttachments.length > 0 || message.trim()) {
        if (!user) throw new Error(t('chat.send.failedFallback'));
        
        // Prepare message data - ensure we don't send empty message when we have attachments
        const messageText = message.trim();
        
        if (isDoctor && patientId && appointmentId) {
          // Doctor sending to patient
          if (!user.id) throw new Error(t('chat.send.failedFallback'));
          await chatApi.sendMessageToPatient(
            user.id,
            patientId,
            appointmentId,
            messageText || '',
            uploadedAttachments.length > 0 ? uploadedAttachments as any : undefined
          );
        } else if (!isDoctor && doctorId && appointmentId) {
          // Patient sending to doctor
          await chatApi.sendMessageToDoctor(
            doctorId,
            appointmentId,
            messageText || '',
            uploadedAttachments.length > 0 ? uploadedAttachments as any : undefined,
            user.id
          );
        } else {
          throw new Error(t('chat.send.failedFallback'));
        }

        // Clear pending files and message
        setPendingFiles([]);
        setMessage('');
        
        await queryClient.invalidateQueries({ queryKey: ['conversationMessages', actualConversationId] });
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
        await queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        await queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      const errorMessage = (error as any)?.response?.data?.message || error?.message || t('chat.send.failedFallback');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSend = () => {
    if ((message.trim() || pendingFiles.length > 0) && !sendMessageMutation.isPending && !uploadingFiles) {
      if (pendingFiles.length > 0) {
        // Upload and send files
        uploadAndSendFiles();
      } else {
        // Send text message only
        sendMessageMutation.mutate(message.trim());
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle file download/open
  const handleFileOpen = async (fileUrl: string, fileName: string) => {
    try {
      const normalizedUrl = normalizeImageUrl(fileUrl);
      if (!normalizedUrl) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('chat.files.invalidFileUrl'),
        });
        return;
      }

      // Check if we can open the URL directly
      const canOpen = await Linking.canOpenURL(normalizedUrl);
      if (canOpen) {
        // Try to open the file
        const opened = await Linking.openURL(normalizedUrl);
        if (!opened) {
          // If direct open fails, try to download
          await handleFileDownload(normalizedUrl, fileName);
        }
      } else {
        // If can't open directly, download the file
        await handleFileDownload(normalizedUrl, fileName);
      }
    } catch (error: any) {
      console.error('Error opening file:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error?.message || t('chat.files.failedToOpenFile'),
      });
    }
  };

  // Handle file download
  const handleFileDownload = async (fileUrl: string, fileName: string) => {
    try {
      Toast.show({
        type: 'info',
        text1: t('chat.files.downloadingTitle'),
        text2: t('chat.files.pleaseWaitDots'),
      });

      // Create a file path in the cache directory
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileUri = `${cacheDir}${sanitizedFileName || `file-${Date.now()}`}`.replace(/\/\/+/g, '/');

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);

      if (downloadResult.status === 200) {
        // Try to open with Linking (works for most file types on mobile)
        try {
          // For Android, we can use content:// URI
          if (Platform.OS === 'android') {
            // Try to open the file directly
            const canOpen = await Linking.canOpenURL(`file://${downloadResult.uri}`);
            if (canOpen) {
              await Linking.openURL(`file://${downloadResult.uri}`);
            } else {
              // Fallback: show success message
              Alert.alert(
                t('chat.files.downloadCompleteTitle'),
                t('chat.files.fileDownloaded', { name: sanitizedFileName }),
                [{ text: t('common.ok') }]
              );
            }
          } else {
            // For iOS, try to open directly
            const canOpen = await Linking.canOpenURL(downloadResult.uri);
            if (canOpen) {
              await Linking.openURL(downloadResult.uri);
            } else {
              Alert.alert(
                t('chat.files.downloadCompleteTitle'),
                t('chat.files.fileDownloaded', { name: sanitizedFileName }),
                [{ text: t('common.ok') }]
              );
            }
          }

          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('chat.files.fileDownloadedAndOpened'),
          });
        } catch (openError) {
          // If opening fails, at least the file is downloaded
          Alert.alert(
            t('chat.files.downloadCompleteTitle'),
            t('chat.files.fileDownloadedFindInManager', { name: sanitizedFileName }),
            [{ text: t('common.ok') }]
          );
        }
      } else {
        throw new Error(t('chat.files.downloadFailedBody'));
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      Toast.show({
        type: 'error',
        text1: t('chat.files.downloadFailedTitle'),
        text2: error?.message || t('chat.files.downloadFailedBody'),
      });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Get date from message (need to get from original message data)
    const originalMessage = messagesResponse?.data?.messages?.[index];
    const messageDate = originalMessage?.createdAt || '';
    const prevMessageDate = messagesResponse?.data?.messages?.[index - 1]?.createdAt || '';
    
    const showDateSeparator = index === 0 || 
      (index > 0 && formatDate(messageDate, t) !== formatDate(prevMessageDate, t));

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(messageDate, t)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, item.isSent ? styles.sentMessage : styles.receivedMessage]}>
          {!item.isSent && (
            <Image source={item.senderAvatar} style={styles.messageAvatar} />
          )}
          <View style={[styles.messageBubble, item.isSent ? styles.sentBubble : styles.receivedBubble]}>
            {item.type === 'text' && (
              <Text style={[styles.messageText, item.isSent && styles.sentMessageText]}>
                {item.message}
              </Text>
            )}
            {item.type === 'audio' && (
              <View style={[styles.audioMessage, !item.isSent && styles.audioMessageReceived]}>
                <TouchableOpacity style={styles.playButton} activeOpacity={0.7}>
                  <Ionicons name="play" size={16} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.audioWaveform}>
                  <View style={[styles.waveBar, { height: 20 }]} />
                  <View style={[styles.waveBar, { height: 30 }]} />
                  <View style={[styles.waveBar, { height: 25 }]} />
                  <View style={[styles.waveBar, { height: 35 }]} />
                  <View style={[styles.waveBar, { height: 20 }]} />
                </View>
                <Text style={styles.audioDuration}>{item.audioDuration}</Text>
              </View>
            )}
            {item.type === 'image' && item.images && item.images.length > 0 && (
              <View style={styles.imageContainer}>
                {item.images.slice(0, 3).map((img, idx) => {
                  const imageUrl = normalizeImageUrl(img);
                  return imageUrl ? (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.9}
                      onPress={() => {
                        setImagePreview({
                          visible: true,
                          images: item.images || [],
                          currentIndex: idx,
                        });
                      }}
                    >
                      <Image source={{ uri: imageUrl }} style={styles.messageImage} />
                    </TouchableOpacity>
                  ) : null;
                })}
                {item.images.length > 3 && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setImagePreview({
                        visible: true,
                        images: item.images || [],
                        currentIndex: 3,
                      });
                    }}
                  >
                    <View style={[styles.messageImage, styles.moreImagesOverlay]}>
                      <Text style={styles.moreImagesText}>+{item.images.length - 3}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {item.type === 'file' && item.fileInfo && (
              <TouchableOpacity 
                style={styles.fileMessage}
                activeOpacity={0.7}
                onPress={() => {
                  // Get file URL from attachment
                  const attachment = messagesResponse?.data?.messages?.[index]?.attachments?.[0];
                  if (attachment) {
                    // Handle both string URL and object format
                    const fileUrl = typeof attachment === 'object' && attachment !== null 
                      ? (attachment as any).url 
                      : String(attachment);
                    const fileName = item.fileInfo?.name || (typeof attachment === 'object' && attachment !== null 
                      ? (attachment as any).name 
                      : 'file');
                    handleFileOpen(fileUrl, fileName);
                  } else {
                    Toast.show({
                      type: 'error',
                      text1: t('common.error'),
                      text2: t('chat.files.fileUrlNotFound'),
                    });
                  }
                }}
              >
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{item.fileInfo.name}</Text>
                  <Text style={styles.fileType}>{item.fileInfo.type.toUpperCase()}</Text>
                </View>
                <Ionicons name="download-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            {item.type === 'location' && (
              <View style={styles.locationMessage}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={styles.locationText}>My Location</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.downloadLink}>View</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{item.time}</Text>
              {item.isSent && (
                <Ionicons
                  name={item.isRead ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.isRead ? colors.success : colors.textSecondary}
                  style={styles.readIndicator}
                />
              )}
            </View>
          </View>
          {item.isSent && (
            <Image source={item.senderAvatar} style={styles.messageAvatar} />
          )}
        </View>
      </View>
    );
  };

  // Get recipient avatar source
  const recipientAvatar = useMemo(() => {
    const imageUrl = normalizeImageUrl(recipientProfileImage);
    return imageUrl ? { uri: imageUrl } : defaultAvatar;
  }, [recipientProfileImage]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image source={recipientAvatar} style={styles.headerAvatar} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recipientName || t('chat.nav.chat')}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <View style={styles.contentContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {conversationLoading ? t('chat.detail.settingUpConversation') : t('chat.detail.loadingMessages')}
              </Text>
            </View>
          )}
          
          {!hasRequiredParams && !isLoading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>
                {isDoctor 
                  ? t('chat.detail.patientInfoMissing')
                  : t('chat.detail.doctorInfoMissing')}
              </Text>
              <Text style={styles.errorSubtext}>
                {t('chat.detail.pleaseGoBack')}
              </Text>
            </View>
          )}
          
          {error && !conversationLoading && actualConversationId && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>{t('chat.detail.failedToLoadMessages')}</Text>
              <Text style={styles.errorSubtext}>
                {(error as any)?.response?.data?.message || (error as any)?.message || t('chat.detail.pleaseTryAgain')}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {conversationSetupError && !conversationLoading && !actualConversationId && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>{t('chat.detail.failedToOpenChat')}</Text>
              <Text style={styles.errorSubtext}>
                {(conversationSetupError as any)?.response?.data?.message || (conversationSetupError as any)?.message || t('chat.detail.pleaseTryAgain')}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  if (isDoctor) {
                    refetchDoctorConversation();
                  } else {
                    refetchPatientConversation();
                  }
                }}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {isWaitingForConversation && (
            <View style={styles.errorContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.errorText}>{t('chat.detail.creatingConversation')}</Text>
              <Text style={styles.errorSubtext}>{t('chat.detail.pleaseWait')}</Text>
            </View>
          )}
          
          {!isLoading && !error && messages.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>{t('chat.common.noMessagesYet')}</Text>
              <Text style={styles.emptySubtext}>{t('chat.detail.startTheConversation')}</Text>
            </View>
          )}
          
          {!isLoading && !error && messages.length > 0 && (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          )}
        </View>

        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <View style={styles.pendingFilesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingFilesScroll}>
              {pendingFiles.map((file, index) => (
                <View key={index} style={styles.pendingFileItem}>
                  {file.isImage ? (
                    <Image source={{ uri: file.uri }} style={styles.pendingFileImage} />
                  ) : (
                    <View style={styles.pendingFileIcon}>
                      <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => removePendingFile(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                  <Text style={styles.pendingFileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={[styles.inputIcon, uploadingFiles && styles.inputIconDisabled]} 
              activeOpacity={0.7}
              onPress={handleImagePicker}
              disabled={uploadingFiles}
            >
              <Ionicons name="image-outline" size={20} color={uploadingFiles ? colors.textLight : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.inputIcon, uploadingFiles && styles.inputIconDisabled]} 
              activeOpacity={0.7}
              onPress={handleDocumentPicker}
              disabled={uploadingFiles}
            >
              <Ionicons name="attach-outline" size={20} color={uploadingFiles ? colors.textLight : colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={t('chat.detail.messagePlaceholder')}
              placeholderTextColor={colors.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              editable={!uploadingFiles}
            />
            <TouchableOpacity
              style={[styles.sendButton, ((!message.trim() && pendingFiles.length === 0) || sendMessageMutation.isPending || uploadingFiles) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={(!message.trim() && pendingFiles.length === 0) || sendMessageMutation.isPending || uploadingFiles}
              activeOpacity={0.7}
            >
              {(sendMessageMutation.isPending || uploadingFiles) ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <Ionicons name="send" size={20} color={colors.textWhite} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreview.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreview({ visible: false, images: [], currentIndex: 0 })}
      >
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity
            style={styles.imagePreviewCloseButton}
            onPress={() => setImagePreview({ visible: false, images: [], currentIndex: 0 })}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.textWhite} />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: imagePreview.currentIndex * width, y: 0 }}
            style={styles.imagePreviewScrollView}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setImagePreview(prev => ({ ...prev, currentIndex: newIndex }));
            }}
          >
            {imagePreview.images.map((img, idx) => {
              const imageUrl = normalizeImageUrl(img);
              return imageUrl ? (
                <View key={idx} style={styles.imagePreviewItem}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.imagePreviewImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null;
            })}
          </ScrollView>

          {imagePreview.images.length > 1 && (
            <View style={styles.imagePreviewIndicator}>
              <Text style={styles.imagePreviewIndicatorText}>
                {imagePreview.currentIndex + 1} / {imagePreview.images.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    padding: 12,
    borderRadius: 12,
  },
  sentBubble: {
    backgroundColor: colors.background,
    borderTopRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: colors.primaryLight,
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sentMessageText: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: 4,
  },
  readIndicator: {
    marginLeft: 2,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
  },
  audioMessageReceived: {
    backgroundColor: colors.background,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 3,
  },
  waveBar: {
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  audioDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  messageImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  downloadLink: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputIcon: {
    padding: 8,
  },
  inputIconDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
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
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pendingFilesContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pendingFilesScroll: {
    flexDirection: 'row',
  },
  pendingFileItem: {
    marginRight: 8,
    width: 80,
    alignItems: 'center',
    position: 'relative',
  },
  pendingFileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
  },
  pendingFileIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFileButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  pendingFileName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    width: 80,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewScrollView: {
    flex: 1,
  },
  imagePreviewItem: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: width,
    height: '100%',
  },
  imagePreviewIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imagePreviewIndicatorText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '500',
  },
});

export { ChatDetailScreen };
