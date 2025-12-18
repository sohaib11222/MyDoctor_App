import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

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

const ChatDetailScreen = () => {
  const navigation = useNavigation<ChatDetailScreenNavigationProp>();
  const route = useRoute<ChatDetailRouteProp>();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const { recipientName, chatId } = route.params;
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Mock messages data
  const messages: Message[] = [
    {
      id: '1',
      sender: 'Andrea Kearns',
      senderAvatar: require('../../../assets/avatar.png'),
      message: 'Hello Doctor, could you tell a diet plan that suits for me?',
      time: '8:16 PM',
      isSent: true,
      isRead: true,
      type: 'text',
    },
    {
      id: '2',
      sender: 'Edalin Hendry',
      senderAvatar: require('../../../assets/avatar.png'),
      message: '',
      time: '9:45 AM',
      isSent: false,
      isRead: true,
      type: 'audio',
      audioDuration: '0:05',
    },
    {
      id: '3',
      sender: 'Andrea Kearns',
      senderAvatar: require('../../../assets/avatar.png'),
      message: 'https://www.youtube.com/watch?v=GCmL3mS0Psk',
      time: '9:47 AM',
      isSent: true,
      isRead: true,
      type: 'text',
    },
    {
      id: '4',
      sender: 'Edalin Hendry',
      senderAvatar: require('../../../assets/avatar.png'),
      message: '',
      time: '9:50 AM',
      isSent: false,
      isRead: true,
      type: 'image',
      // images: ['https://via.placeholder.com/200', 'https://via.placeholder.com/200', 'https://via.placeholder.com/200'],
    },
    {
      id: '5',
      sender: 'Andrea Kearns',
      senderAvatar: require('../../../assets/avatar.png'),
      message: '',
      time: '8:16 PM',
      isSent: true,
      isRead: true,
      type: 'location',
    },
    {
      id: '6',
      sender: 'Andrea Kearns',
      senderAvatar: require('../../../assets/avatar.png'),
      message: 'Thank you for your support',
      time: '8:16 PM',
      isSent: true,
      isRead: true,
      type: 'text',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // In a real app, this would send the message to the backend
      setMessage('');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showDateSeparator = index === 0 || (index > 0 && messages[index - 1].time.split(' ')[0] !== item.time.split(' ')[0]);
    const isToday = item.time.includes('PM') || item.time.includes('AM');

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{isToday ? 'Today, March 25' : item.time}</Text>
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <View style={styles.contentContainer}>
          {/* Messages List */}
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
          />
        </View>

        {/* Input Area */}
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
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={colors.textWhite} />
          </TouchableOpacity>
        </View>
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
});

export { ChatDetailScreen };
