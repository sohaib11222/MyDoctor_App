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
} from 'react-native';
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
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
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
  const { recipientName, chatId, conversationId, appointmentId, patientId, doctorId } = route.params;
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // For patients: Get or create conversation first if conversationId is not set
  const { data: patientConversationData, isLoading: patientConversationLoading } = useQuery({
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
  const { data: doctorConversationData, isLoading: doctorConversationLoading } = useQuery({
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
  const actualConversationId = conversationId || conversationData?.data?._id || chatId;

  // Check if we have the required parameters
  const hasRequiredParams = isDoctor 
    ? (!!patientId && !!appointmentId)
    : (!!doctorId && !!appointmentId);

  // Fetch messages for conversation
  const { data: messagesResponse, isLoading: messagesLoading, error, refetch } = useQuery({
    queryKey: ['conversationMessages', actualConversationId],
    queryFn: () => {
      if (!actualConversationId) {
        throw new Error('Conversation ID is required');
      }
      return chatApi.getMessages(actualConversationId, { page: 1, limit: 100 });
    },
    enabled: !!actualConversationId && hasRequiredParams,
    retry: 1,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const isLoading = messagesLoading || conversationLoading;
  
  // Check if we're still waiting for conversation to be created
  const isWaitingForConversation = !actualConversationId && hasRequiredParams && !conversationLoading;

  // Transform backend messages to UI format
  const messages = useMemo(() => {
    if (!messagesResponse?.data?.messages) return [];
    
    return messagesResponse.data.messages.map((msg: chatApi.ChatMessage): Message => {
      const isSent = msg.senderId._id === user?.id;
      const senderName = msg.senderId.fullName || 'Unknown';
      const senderImage = msg.senderId.profileImage;
      
      return {
        id: msg._id,
        sender: senderName,
        senderAvatar: senderImage 
          ? { uri: normalizeImageUrl(senderImage) || undefined }
          : defaultAvatar,
        message: msg.message || '',
        time: formatTime(msg.createdAt),
        isSent,
        isRead: msg.isRead,
        type: msg.attachments && msg.attachments.length > 0 ? 'image' : 'text',
        images: msg.attachments || undefined,
      };
    });
  }, [messagesResponse, user?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!user) throw new Error('User not found');
      
      if (isDoctor && patientId && appointmentId) {
        // Doctor sending to patient
        if (!user.id) throw new Error('User ID not found');
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
        throw new Error('Invalid conversation parameters');
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
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send message';
      Toast.show({
        type: 'error',
        text1: 'Error',
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

  const handleSend = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Get date from message (need to get from original message data)
    const originalMessage = messagesResponse?.data?.messages?.[index];
    const messageDate = originalMessage?.createdAt || '';
    const prevMessageDate = messagesResponse?.data?.messages?.[index - 1]?.createdAt || '';
    
    const showDateSeparator = index === 0 || 
      (index > 0 && formatDate(messageDate) !== formatDate(prevMessageDate));

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(messageDate)}</Text>
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
            {item.type === 'image' && item.images && (
              <View style={styles.imageContainer}>
                {item.images.slice(0, 3).map((img, idx) => (
                  <Image key={idx} source={{ uri: img }} style={styles.messageImage} />
                ))}
                {item.images.length > 3 && (
                  <View style={[styles.messageImage, styles.moreImagesOverlay]}>
                    <Text style={styles.moreImagesText}>+{item.images.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
            {item.type === 'location' && (
              <View style={styles.locationMessage}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={styles.locationText}>My Location</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.downloadLink}>Download</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.type === 'file' && item.fileInfo && (
              <View style={styles.fileMessage}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{item.fileInfo.name}</Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.downloadLink}>Download</Text>
                  </TouchableOpacity>
                </View>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipientName || 'Chat'}
        </Text>
        <View style={styles.headerRight} />
      </View> */}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.contentContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {conversationLoading ? 'Setting up conversation...' : 'Loading messages...'}
              </Text>
            </View>
          )}
          
          {!hasRequiredParams && !isLoading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>
                {isDoctor 
                  ? 'Patient information is missing'
                  : 'Doctor information is missing'}
              </Text>
              <Text style={styles.errorSubtext}>
                Please go back and try again
              </Text>
            </View>
          )}
          
          {error && !conversationLoading && actualConversationId && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>Failed to load messages</Text>
              <Text style={styles.errorSubtext}>
                {error?.response?.data?.message || error?.message || 'Please try again'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {isWaitingForConversation && (
            <View style={styles.errorContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.errorText}>Creating conversation...</Text>
              <Text style={styles.errorSubtext}>Please wait</Text>
            </View>
          )}
          
          {!isLoading && !error && messages.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation</Text>
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

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
              <Ionicons name="happy-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIcon} activeOpacity={0.7}>
              <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type your message here..."
              placeholderTextColor={colors.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!message.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
              activeOpacity={0.7}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <Ionicons name="send" size={20} color={colors.textWhite} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </KeyboardAvoidingView>
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
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputIcon: {
    padding: 8,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
    marginHorizontal: 16,
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
});

export { ChatDetailScreen };
