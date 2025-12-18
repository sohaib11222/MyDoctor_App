import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons, Feather } from '@expo/vector-icons';

type ChatListScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'ChatList'>;

const { width } = Dimensions.get('window');

interface Chat {
  id: string;
  name: string;
  avatar: any; // Changed to any for require() images
  lastMessage: string;
  lastTime: string;
  isOnline: boolean;
  isPinned: boolean;
  unreadCount?: number;
  messageType?: 'text' | 'video' | 'audio' | 'file' | 'image' | 'location' | 'missed-call';
  isRead?: boolean;
}

// Patient chats (for patients - showing doctors)
const patientChats: Chat[] = [
  {
    id: '1',
    name: 'Adrian Marshall',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Have you called them?',
    lastTime: 'Just Now',
    isOnline: true,
    isPinned: true,
    isRead: true,
    messageType: 'text',
  },
  {
    id: '2',
    name: 'Dr Joseph Boyd',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Video',
    lastTime: 'Yesterday',
    isOnline: false,
    isPinned: true,
    isRead: false,
    messageType: 'video',
  },
  {
    id: '3',
    name: 'Dr Edalin Hendry',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Prescription.doc',
    lastTime: '10:20 PM',
    isOnline: true,
    isPinned: true,
    isRead: true,
    messageType: 'file',
  },
  {
    id: '4',
    name: 'Kelly Stevens',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Have you called them?',
    lastTime: 'Just Now',
    isOnline: true,
    isPinned: false,
    unreadCount: 2,
    messageType: 'text',
  },
  {
    id: '5',
    name: 'Robert Miller',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Video',
    lastTime: 'Yesterday',
    isOnline: true,
    isPinned: false,
    isRead: true,
    messageType: 'video',
  },
  {
    id: '6',
    name: 'Emily Musick',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Project Tools.doc',
    lastTime: '10:20 PM',
    isOnline: false,
    isPinned: false,
    messageType: 'file',
  },
  {
    id: '7',
    name: 'Samuel James',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Audio',
    lastTime: '12:30 PM',
    isOnline: true,
    isPinned: false,
    isRead: true,
    messageType: 'audio',
  },
  {
    id: '8',
    name: 'Dr Shanta Neill',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Missed Call',
    lastTime: 'Yesterday',
    isOnline: false,
    isPinned: false,
    messageType: 'missed-call',
  },
];

// Doctor chats (for doctors - showing patients)
const doctorChats: Chat[] = [
  {
    id: '1',
    name: 'Adrian Marshall',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Thank you doctor for the consultation',
    lastTime: 'Just Now',
    isOnline: true,
    isPinned: true,
    isRead: true,
    messageType: 'text',
  },
  {
    id: '2',
    name: 'Kelly Stevens',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Video',
    lastTime: 'Yesterday',
    isOnline: false,
    isPinned: true,
    isRead: false,
    messageType: 'video',
  },
  {
    id: '3',
    name: 'Samuel Anderson',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Lab Report.pdf',
    lastTime: '10:20 PM',
    isOnline: true,
    isPinned: true,
    isRead: true,
    messageType: 'file',
  },
  {
    id: '4',
    name: 'Catherine Griffin',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'When can I schedule my next appointment?',
    lastTime: 'Just Now',
    isOnline: true,
    isPinned: false,
    unreadCount: 2,
    messageType: 'text',
  },
  {
    id: '5',
    name: 'Robert Hutchinson',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Video',
    lastTime: 'Yesterday',
    isOnline: true,
    isPinned: false,
    isRead: true,
    messageType: 'video',
  },
];

const onlineContacts = [
  { id: '1', avatar: require('../../../assets/Group 42.png') },
  { id: '2', avatar: require('../../../assets/Group 42.png') },
  { id: '3', avatar: require('../../../assets/Group 42.png') },
  { id: '4', avatar: require('../../../assets/Group 42.png') },
  { id: '5', avatar: require('../../../assets/Group 42.png') },
  { id: '6', avatar: require('../../../assets/Group 42.png') },
];

const ChatListScreen = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const [searchQuery, setSearchQuery] = useState('');

  const allChats = isDoctor ? doctorChats : patientChats;
  const pinnedChats = allChats.filter((chat) => chat.isPinned);
  const recentChats = allChats.filter((chat) => !chat.isPinned);

  const filteredPinnedChats = pinnedChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRecentChats = recentChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatDetail', { recipientName: item.name, chatId: item.id })}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          {isDoctor && (
            <TouchableOpacity
              style={styles.adminChatButton}
              onPress={() => navigation.navigate('AdminChat')}
              activeOpacity={0.7}
            >
              <Ionicons name="headset-outline" size={20} color={colors.textWhite} />
            </TouchableOpacity>
          )}
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Online Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Online Now</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineContactsContainer}
          >
            {onlineContacts.map((contact) => (
              <TouchableOpacity key={contact.id} style={styles.onlineContact} activeOpacity={0.7}>
                <View style={styles.onlineAvatarContainer}>
                  <Image source={contact.avatar} style={styles.onlineAvatar} />
                  <View style={styles.onlineIndicatorSmall} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
    position: 'absolute',
    right: 0,
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
});

export { ChatListScreen };
