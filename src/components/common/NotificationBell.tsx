import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import * as notificationApi from '../../services/notification';

export const NotificationBell = ({ color = colors.textWhite }: { color?: string }) => {
  const navigation = useNavigation<any>();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: () => notificationApi.getUnreadNotificationsCount(),
    refetchInterval: 30000,
  });

  const handlePress = () => {
    try {
      const tabNavigator = navigation.getParent?.();
      if (tabNavigator) {
        tabNavigator.navigate('More', { screen: 'Notifications' });
        return;
      }
    } catch {
      // ignore
    }

    try {
      navigation.navigate('Notifications');
    } catch {
      // ignore
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <Ionicons name="notifications-outline" size={22} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '700',
  },
});
