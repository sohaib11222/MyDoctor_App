import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  time: string;
}

const notifications: Notification[] = [
  {
    id: '1',
    icon: 'notifications',
    title: 'Appointment Reminder',
    message: 'Your appointment with Dr. John Doe is scheduled for tomorrow at 10:00 AM',
    time: '2 hours ago',
  },
  {
    id: '2',
    icon: 'chatbubble',
    title: 'New Message',
    message: 'You have a new message from Dr. Sarah Smith',
    time: '5 hours ago',
  },
  {
    id: '3',
    icon: 'document-text',
    title: 'Prescription Ready',
    message: 'Your prescription is ready for download',
    time: '1 day ago',
  },
  {
    id: '4',
    icon: 'calendar',
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Michael Brown has been confirmed',
    time: '2 days ago',
  },
  {
    id: '5',
    icon: 'checkmark-circle',
    title: 'Payment Received',
    message: 'Your payment of $300 has been received successfully',
    time: '3 days ago',
  },
];

export const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();

  const getIconName = (icon: string) => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      notifications: 'notifications',
      chatbubble: 'chatbubble',
      'document-text': 'document-text',
      calendar: 'calendar',
      'checkmark-circle': 'checkmark-circle',
    };
    return iconMap[icon] || 'notifications';
  };

  const handleDelete = (id: string) => {
    // Handle delete notification
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <View key={notification.id} style={styles.notificationItem}>
            <View style={styles.notificationIcon}>
              <Ionicons
                name={getIconName(notification.icon)}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(notification.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textLight,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
  },
});

