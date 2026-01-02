import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as chatApi from '../../services/chat';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

type AdminChatScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'AdminChat'>;
type AdminChatRouteProp = RouteProp<ChatStackParamList, 'AdminChat'>;

interface Admin {
  id: string;
  conversationId: string;
  adminId: string;
  name: string;
  avatar: any;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
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

/**
 * Format date to relative time string
 */
const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format time for messages
 */
const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

interface Message {
  id: string;
  sender: 'admin' | 'doctor';
  message: string;
  time: string;
  date: string;
}

// Mock admins removed - using real data from backend

const sampleMessages: Message[] = [
  {
    id: '1',
    sender: 'admin',
    message: 'Hello! How can we assist you today?',
    time: '10:00 AM',
    date: '15 Nov 2024',
  },
  {
    id: '2',
    sender: 'doctor',
    message: 'I have a question about my subscription plan.',
    time: '10:05 AM',
    date: '15 Nov 2024',
  },
  {
    id: '3',
    sender: 'admin',
    message: 'Sure! What would you like to know?',
    time: '10:06 AM',
    date: '15 Nov 2024',
  },
  {
    id: '4',
    sender: 'doctor',
    message: 'Can I upgrade my plan mid-month?',
    time: '10:10 AM',
    date: '15 Nov 2024',
  },
  {
    id: '5',
    sender: 'admin',
    message: 'Yes, you can upgrade at any time. The billing will be prorated.',
    time: '10:15 AM',
    date: '15 Nov 2024',
  },
];

export const AdminChatScreen = () => {
  const navigation = useNavigation<AdminChatScreenNavigationProp>();
  const route = useRoute<AdminChatRouteProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { conversationId: routeConversationId, adminId: routeAdminId } = route.params || {};
  
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch all conversations to get admin-doctor conversations
  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => chatApi.getConversations({ page: 1, limit: 100 }),
    enabled: !!user && user?.role === 'doctor',
    retry: 1,
  });

  // Extract admin-doctor conversations
  const adminConversations = useMemo(() => {
    if (!conversationsResponse?.data?.conversations) return [];
    
    return conversationsResponse.data.conversations
      .filter((conv: chatApi.Conversation) => conv.conversationType === 'ADMIN_DOCTOR')
      .map((conv: chatApi.Conversation): Admin => {
        const adminId = typeof conv.adminId === 'object' ? conv.adminId?._id : conv.adminId;
        const admin = typeof conv.adminId === 'object' ? conv.adminId : null;
        const imageUri = admin?.profileImage || null;
        const lastMessage = conv.lastMessage?.message || 'No messages yet';
        const lastTime = formatRelativeTime(conv.lastMessageAt || conv.lastMessage?.createdAt || '');
        
        return {
          id: conv._id,
          conversationId: conv._id,
          adminId: adminId || '',
          name: admin?.fullName || 'Admin Support',
          avatar: imageUri ? { uri: normalizeImageUrl(imageUri) || undefined } : defaultAvatar,
          lastMessage,
          lastMessageTime: lastTime,
          unread: conv.unreadCount || 0,
          online: false, // TODO: Implement online status
        };
      });
  }, [conversationsResponse]);

  // Auto-select admin if conversationId is provided
  useEffect(() => {
    if (routeConversationId && adminConversations.length > 0) {
      const admin = adminConversations.find(a => a.conversationId === routeConversationId);
      if (admin) {
        setSelectedAdmin(admin);
      }
    } else if (adminConversations.length > 0 && !selectedAdmin) {
      // Select first admin by default
      setSelectedAdmin(adminConversations[0]);
    }
  }, [routeConversationId, adminConversations]);

  // Fetch messages for selected conversation
  const { data: messagesResponse, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['adminConversationMessages', selectedAdmin?.conversationId],
    queryFn: () => {
      if (!selectedAdmin?.conversationId) throw new Error('Conversation ID not found');
      return chatApi.getMessages(selectedAdmin.conversationId, { page: 1, limit: 100 });
    },
    enabled: !!selectedAdmin?.conversationId,
    retry: 1,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Transform messages to UI format
  const messages = useMemo(() => {
    if (!messagesResponse?.data?.messages) return [];
    
    return messagesResponse.data.messages.map((msg: chatApi.ChatMessage): Message => {
      const isDoctor = msg.senderId._id === user?.id;
      return {
        id: msg._id,
        sender: isDoctor ? 'doctor' : 'admin',
        message: msg.message || '',
        time: formatTime(msg.createdAt),
        date: new Date(msg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    });
  }, [messagesResponse, user?.id]);

  // Start conversation if needed (when doctor first opens admin chat)
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');
      
      // Get admin ID from route or selected admin
      const adminId = routeAdminId || selectedAdmin?.adminId;
      if (!user.id) throw new Error('User ID not found');
      
      if (!adminId) {
        // If no adminId, backend will use token to determine admin
        const response = await chatApi.startConversationWithAdmin(user.id, undefined);
        return response;
      } else {
        const response = await chatApi.startConversationWithAdmin(user.id, adminId);
        return response;
      }
    },
    onSuccess: async (response) => {
      if (response?.data?._id) {
        // Update selected admin with new conversation
        const newConversation = response.data;
        const adminId = typeof newConversation.adminId === 'object' 
          ? newConversation.adminId?._id 
          : newConversation.adminId;
        
        const admin = typeof newConversation.adminId === 'object' 
          ? newConversation.adminId 
          : null;
        
        if (adminId && admin) {
          setSelectedAdmin({
            id: newConversation._id,
            conversationId: newConversation._id,
            adminId: adminId,
            name: admin.fullName || 'Admin Support',
            avatar: admin.profileImage 
              ? { uri: normalizeImageUrl(admin.profileImage) || undefined }
              : defaultAvatar,
            lastMessage: 'No messages yet',
            lastMessageTime: 'Just Now',
            unread: 0,
            online: false,
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Auto-start conversation if no admin conversations exist and we have route params
  useEffect(() => {
    if (user && user.role === 'doctor' && adminConversations.length === 0 && !conversationsLoading && !startConversationMutation.isPending) {
      // Only auto-start if we have an adminId from route params
      if (routeAdminId) {
        startConversationMutation.mutate();
      }
    }
  }, [user, adminConversations.length, conversationsLoading, routeAdminId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!user || !selectedAdmin) throw new Error('User or admin not found');
      
      // Get admin ID - try from selectedAdmin first, then from conversation
      const adminId = selectedAdmin.adminId || routeAdminId;
      if (!adminId) throw new Error('Admin ID not found');
      
      return await chatApi.sendMessageToAdmin(
        user.id || '',
        adminId,
        messageText
      );
    },
    onSuccess: async () => {
      setNewMessage('');
      await queryClient.invalidateQueries({ queryKey: ['adminConversationMessages', selectedAdmin?.conversationId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
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
    mutationFn: () => chatApi.markMessagesAsRead(selectedAdmin!.conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  // Mark as read when conversation is selected
  useEffect(() => {
    if (selectedAdmin?.conversationId) {
      markAsReadMutation.mutate();
    }
  }, [selectedAdmin?.conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedAdmin && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      refetchMessages(),
    ]);
    setRefreshing(false);
  };

  const renderAdminItem = ({ item }: { item: Admin }) => (
    <TouchableOpacity
      style={[styles.adminItem, selectedAdmin?.id === item.id && styles.adminItemActive]}
      onPress={() => setSelectedAdmin(item)}
      activeOpacity={0.7}
    >
      <View style={styles.adminAvatarContainer}>
        <Image source={item.avatar} style={styles.adminAvatar} />
        {item.online && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.adminInfo}>
        <Text style={styles.adminName}>{item.name}</Text>
        <Text style={styles.adminLastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
        <Text style={styles.adminTime}>{item.lastMessageTime}</Text>
      </View>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isDoctor = item.sender === 'doctor';
    return (
      <View style={[styles.messageContainer, isDoctor ? styles.sentMessage : styles.receivedMessage]}>
        <View style={[styles.messageBubble, isDoctor ? styles.sentBubble : styles.receivedBubble]}>
          <Text style={[styles.messageText, isDoctor && styles.sentMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isDoctor && styles.sentMessageTime]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Messages</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      
      <View style={styles.content}>
        {/* Admin List Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Administrators</Text>
          </View>
          {conversationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={adminConversations}
              renderItem={renderAdminItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No admin conversations</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {selectedAdmin ? (
            <>
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderInfo}>
                  <View style={styles.chatHeaderAvatarContainer}>
                    <Image source={selectedAdmin.avatar} style={styles.chatHeaderAvatar} />
                    {selectedAdmin.online && <View style={styles.onlineIndicatorSmall} />}
                  </View>
                  <View>
                    <Text style={styles.chatHeaderName}>{selectedAdmin.name}</Text>
                    <Text style={styles.chatHeaderStatus}>
                      {selectedAdmin.online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Messages List */}
              {messagesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No messages yet</Text>
                      <Text style={styles.emptySubtext}>Start the conversation</Text>
                    </View>
                  }
                />
              )}

              {/* Message Input */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
              >
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type your message..."
                    placeholderTextColor={colors.textLight}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {sendMessageMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.textWhite} />
                    ) : (
                      <Ionicons
                        name="send"
                        size={20}
                        color={newMessage.trim() ? colors.textWhite : colors.textLight}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
              <Text style={styles.placeholderTitle}>Select an administrator</Text>
              <Text style={styles.placeholderText}>
                Choose an admin from the list to start a conversation
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textWhite,
    // flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.35,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  adminItemActive: {
    backgroundColor: colors.primaryLight,
  },
  adminAvatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  adminAvatar: {
    width: 35,
    height: 35,
    borderRadius: 22.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  adminInfo: {
    flex: 1,
    minWidth: 0,
  },
  adminName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  adminLastMessage: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  adminTime: {
    fontSize: 8,
    color: colors.textLight,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 7,
    fontWeight: '600',
    color: colors.textWhite,
  },
  chatArea: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicatorSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
  },
  sentBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  sentMessageText: {
    color: colors.textWhite,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.backgroundLight,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

