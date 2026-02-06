import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as chatApi from '../../services/chat';
import * as appointmentApi from '../../services/appointment';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { NotificationBell } from '../../components/common/NotificationBell';

type ChatListScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'ChatList'>;

const { width } = Dimensions.get('window');

interface Chat {
  id: string;
  conversationId: string;
  name: string;
  avatar: any; // Changed to any for require() images
  lastMessage: string;
  lastTime: string;
  isOnline: boolean;
  isPinned: boolean;
  unreadCount?: number;
  messageType?: 'text' | 'video' | 'audio' | 'file' | 'image' | 'location' | 'missed-call';
  isRead?: boolean;
  conversationType?: 'DOCTOR_PATIENT' | 'ADMIN_DOCTOR';
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentDuration?: number;
  appointmentEndTime?: string;
  patientId?: string;
  doctorId?: string;
  adminId?: string;
}

const hasAppointmentWindowPassed = (chat: Chat) => {
  if (!chat.appointmentDate || !chat.appointmentTime) return false;

  const start = new Date(chat.appointmentDate);
  const [h, m] = String(chat.appointmentTime).split(':').map((x) => Number(x));
  if (Number.isFinite(h) && Number.isFinite(m)) {
    start.setHours(h, m, 0, 0);
  }

  let end: Date | null = null;
  if (chat.appointmentEndTime) {
    const [eh, em] = String(chat.appointmentEndTime).split(':').map((x) => Number(x));
    if (Number.isFinite(eh) && Number.isFinite(em)) {
      end = new Date(start);
      end.setHours(eh, em, 0, 0);
    }
  }

  if (!end) {
    const duration = typeof chat.appointmentDuration === 'number' && chat.appointmentDuration > 0 ? chat.appointmentDuration : 30;
    end = new Date(start.getTime() + duration * 60 * 1000);
  }

  return new Date() > end;
};

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

const defaultAvatar = require('../../../assets/avatar.png');

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

const ChatListScreen = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // For doctors: Fetch conversations directly
  // For patients: Fetch appointments and create conversations from them
  const { data: conversationsResponse, isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => chatApi.getConversations({ page: 1, limit: 100 }),
    enabled: !!user && isDoctor,
    retry: 1,
  });

  // Fetch patient appointments for patient chat
  const { data: appointmentsResponse, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['patientAppointments', user?.id],
    queryFn: () => appointmentApi.listAppointments({ status: 'CONFIRMED', limit: 100 }),
    enabled: !!user && !isDoctor && user?.role === 'patient',
    retry: 1,
  });

  const isLoading = isDoctor ? conversationsLoading : appointmentsLoading;
  const error = isDoctor ? conversationsError : null;

  // Fetch unread count
  const { data: unreadResponse } = useQuery({
    queryKey: ['unreadCount', user?.id],
    queryFn: () => chatApi.getUnreadCount(),
    enabled: !!user && isDoctor,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Transform conversations to Chat format
  const allChats = useMemo(() => {
    if (isDoctor) {
      // Doctor: Use conversations from API (both patient and admin conversations)
      if (!conversationsResponse?.data?.conversations) return [];
      
      return conversationsResponse.data.conversations.map((conv: chatApi.Conversation): Chat => {
      // Determine recipient name and image based on conversation type
      let name = '';
      let imageUri: string | null = null;
      
      if (conv.conversationType === 'DOCTOR_PATIENT') {
        // Doctor viewing patient
        name = conv.patientId?.fullName || 'Unknown Patient';
        imageUri = conv.patientId?.profileImage || null;
      } else if (conv.conversationType === 'ADMIN_DOCTOR') {
        // Doctor viewing admin
        name = conv.adminId?.fullName || 'Admin Support';
        imageUri = conv.adminId?.profileImage || null;
      }
      
      const lastMessage = conv.lastMessage?.message || 'No messages yet';
      const lastTime = formatRelativeTime(conv.lastMessageAt || conv.lastMessage?.createdAt || '');
      const unreadCount = conv.unreadCount || 0;
      
      return {
        id: conv._id,
        conversationId: conv._id,
        name,
        avatar: imageUri ? { uri: normalizeImageUrl(imageUri) || undefined } : defaultAvatar,
        lastMessage,
        lastTime,
        isOnline: false, // TODO: Implement online status
        isPinned: false, // TODO: Implement pinning
        unreadCount: unreadCount > 0 ? unreadCount : undefined,
        messageType: 'text',
        isRead: unreadCount === 0,
        conversationType: conv.conversationType,
        appointmentId: typeof conv.appointmentId === 'object' ? conv.appointmentId?._id : conv.appointmentId,
        patientId: typeof conv.patientId === 'object' ? conv.patientId?._id : conv.patientId,
        doctorId: typeof conv.doctorId === 'object' ? conv.doctorId?._id : conv.doctorId,
        adminId: typeof conv.adminId === 'object' ? conv.adminId?._id : conv.adminId,
      };
    });
    } else {
      // Patient: Create conversations from appointments
      if (!appointmentsResponse?.data?.appointments) return [];
      
      return appointmentsResponse.data.appointments.map((apt: any): Chat => {
        const doctorId = typeof apt.doctorId === 'object' ? apt.doctorId?._id : apt.doctorId;
        const doctor = typeof apt.doctorId === 'object' ? apt.doctorId : null;
        const appointmentId = apt._id;
        
        const name = doctor?.fullName || 'Unknown Doctor';
        const imageUri = doctor?.profileImage || null;
        const lastMessage = 'Click to start conversation';
        const lastTime = formatRelativeTime(apt.appointmentDate || apt.createdAt || '');
        
        return {
          id: `conv-${appointmentId}`,
          conversationId: '', // Will be set when conversation is created
          name,
          avatar: imageUri ? { uri: normalizeImageUrl(imageUri) || undefined } : defaultAvatar,
          lastMessage,
          lastTime,
          isOnline: false,
          isPinned: false,
          unreadCount: undefined,
          messageType: 'text',
          isRead: true,
          conversationType: 'DOCTOR_PATIENT',
          appointmentId,
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          appointmentDuration: apt.appointmentDuration,
          appointmentEndTime: apt.appointmentEndTime,
          patientId: user?.id,
          doctorId,
        };
      });
    }
  }, [conversationsResponse, appointmentsResponse, isDoctor, user?.id]);

  const pinnedChats = allChats.filter((chat) => chat.isPinned);
  const recentChats = allChats.filter((chat) => !chat.isPinned);

  const filteredPinnedChats = pinnedChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRecentChats = recentChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isDoctor) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] }),
      ]);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
    }
    setRefreshing(false);
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'video':
        return <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />;
      case 'audio':
        return <Ionicons name="mic-outline" size={14} color={colors.textSecondary} />;
      case 'file':
        return <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />;
      case 'image':
        return <Ionicons name="image-outline" size={14} color={colors.textSecondary} />;
      case 'location':
        return <Ionicons name="location-outline" size={14} color={colors.textSecondary} />;
      case 'missed-call':
        return <Ionicons name="call-outline" size={14} color={colors.error} />;
      default:
        return null;
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const handlePress = () => {
      if (item.conversationType === 'ADMIN_DOCTOR') {
        // Navigate to admin chat
        navigation.navigate('AdminChat', {
          conversationId: item.conversationId,
          adminId: item.adminId || '',
        });
      } else {
        // Navigate to patient/doctor chat
        if (!isDoctor && hasAppointmentWindowPassed(item)) {
          Alert.alert(
            'Chat not available',
            'Communication is only available during the scheduled appointment time window.',
            [{ text: 'OK' }]
          );
          return;
        }
        navigation.navigate('ChatDetail', {
          recipientName: item.name,
          chatId: item.conversationId,
          conversationId: item.conversationId,
          appointmentId: item.appointmentId,
          patientId: item.patientId,
          doctorId: item.doctorId,
        });
      }
    };

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
      <View style={styles.avatarContainer}>
        <Image source={item.avatar} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.chatTime}>{item.lastTime}</Text>
        </View>
        <View style={styles.chatFooter}>
          <View style={styles.messageContainer}>
            {getMessageIcon(item.messageType)}
            <Text
              style={[
                styles.lastMessage,
                item.unreadCount ? styles.unreadMessage : undefined,
                item.messageType === 'missed-call' ? styles.missedCallText : undefined,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
          <View style={styles.chatMeta}>
            {item.isPinned && (
              <Ionicons name="pin" size={14} color={colors.textSecondary} style={styles.pinIcon} />
            )}
            {item.isRead && item.isPinned && (
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
            )}
            {item.unreadCount && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerActions}>
            <NotificationBell />
            {isDoctor && (
              <TouchableOpacity
                style={styles.adminChatButton}
                onPress={() => navigation.navigate('AdminChat', {})}
                activeOpacity={0.7}
              >
                <Ionicons name="headset-outline" size={20} color={colors.textWhite} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>Failed to load conversations</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              if (isDoctor) {
                refetchConversations();
              } else {
                refetchAppointments();
              }
            }}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!isLoading && !error && allChats.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              {isDoctor ? 'Start chatting with your patients' : 'Start chatting with your doctor'}
            </Text>
          </View>
        )}

        {/* Pinned Chat Section */}
        {filteredPinnedChats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pinned Chat</Text>
            </View>
            <FlatList
              data={filteredPinnedChats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Recent Chat Section */}
        {filteredRecentChats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Chat</Text>
            </View>
            <FlatList
              data={filteredRecentChats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
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
    // paddingVertical: 12,
    paddingTop:40,
    paddingBottom:25,
    borderBottomWidth: 1,
    borderBottomRightRadius:30,
    borderBottomLeftRadius:30,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textWhite,
    flex: 1,
    textAlign:'center',
  },
  adminChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginTop: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  section: {
    backgroundColor: colors.background,
    marginTop: 8,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  onlineContactsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  onlineContact: {
    marginRight: 12,
  },
  onlineAvatarContainer: {
    position: 'relative',
  },
  onlineAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.background,
  },
  onlineIndicatorSmall: {
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
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: colors.text,
  },
  missedCallText: {
    color: colors.error,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 4,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.error,
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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

export { ChatListScreen };
