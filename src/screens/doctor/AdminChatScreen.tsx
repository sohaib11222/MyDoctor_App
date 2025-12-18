import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type AdminChatScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'AdminChat'>;

interface Admin {
  id: string;
  name: string;
  avatar: any;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  sender: 'admin' | 'doctor';
  message: string;
  time: string;
  date: string;
}

const mockAdmins: Admin[] = [
  {
    id: '1',
    name: 'Admin Support',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Thank you for your inquiry. We will get back to you soon.',
    lastMessageTime: '10:30 AM',
    unread: 2,
    online: true,
  },
  {
    id: '2',
    name: 'Verification Team',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Your documents have been reviewed.',
    lastMessageTime: 'Yesterday',
    unread: 0,
    online: false,
  },
  {
    id: '3',
    name: 'Billing Support',
    avatar: require('../../../assets/avatar.png'),
    lastMessage: 'Payment processed successfully.',
    lastMessageTime: '2 days ago',
    unread: 1,
    online: true,
  },
];

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
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (selectedAdmin) {
      setMessages(sampleMessages);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [selectedAdmin]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedAdmin) {
      const message: Message = {
        id: (messages.length + 1).toString(),
        sender: 'doctor',
        message: newMessage,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
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
          <FlatList
            data={mockAdmins}
            renderItem={renderAdminItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
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
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />

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
                    style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim()}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={newMessage.trim() ? colors.textWhite : colors.textLight}
                    />
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
});

