import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as notificationApi from '../../services/notification';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

type FilterType = 'all' | 'unread' | 'read';

export const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Build query params based on filter
  const queryParams = useMemo(() => {
    const params: notificationApi.NotificationFilters = { page: 1, limit: 50 };
    if (filter === 'unread') {
      params.isRead = false;
    } else if (filter === 'read') {
      params.isRead = true;
    }
    return params;
  }, [filter]);

  // Fetch notifications
  const { data: notificationsResponse, isLoading, refetch } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => notificationApi.getNotifications(queryParams),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', 'count'] });
      Toast.show({
        type: 'success',
        text1: t('more.notifications.markedAsRead'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.notifications.failedToMarkAsRead');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', 'count'] });
      Toast.show({
        type: 'success',
        text1: t('more.notifications.allMarkedAsRead'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.notifications.failedToMarkAllAsRead');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Extract notifications
  const notifications = useMemo(() => {
    if (!notificationsResponse) return [];
    const responseData = notificationsResponse.data || notificationsResponse;
    return responseData.notifications || [];
  }, [notificationsResponse]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Get notification icon based on type
  const getNotificationIcon = (type: notificationApi.Notification['type']): keyof typeof Ionicons.glyphMap => {
    const typeUpper = (type || 'SYSTEM').toUpperCase();
    switch (typeUpper) {
      case 'APPOINTMENT':
        return 'calendar-outline';
      case 'MESSAGE':
        return 'chatbubble-outline';
      case 'PAYMENT':
        return 'wallet-outline';
      case 'REVIEW':
        return 'star-outline';
      case 'PRESCRIPTION':
        return 'document-text-outline';
      default:
        return 'notifications-outline';
    }
  };

  // Get notification icon color based on type
  const getNotificationIconColor = (type: notificationApi.Notification['type']): string => {
    const typeUpper = (type || 'SYSTEM').toUpperCase();
    switch (typeUpper) {
      case 'APPOINTMENT':
        return '#3B82F6'; // blue
      case 'MESSAGE':
        return '#8B5CF6'; // violet
      case 'PAYMENT':
        return '#F59E0B'; // yellow
      case 'REVIEW':
        return '#F97316'; // orange
      case 'PRESCRIPTION':
        return '#10B981'; // green
      default:
        return colors.primary;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return t('more.notifications.timeAgo.justNow');
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('more.notifications.timeAgo.justNow');
    if (diffInSeconds < 3600) {
      return t('more.notifications.timeAgo.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    }
    if (diffInSeconds < 86400) {
      return t('more.notifications.timeAgo.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    }
    if (diffInSeconds < 604800) {
      return t('more.notifications.timeAgo.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    }
    
    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Handle mark as read
  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    setRefreshing(false);
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: notificationApi.Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationIconColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
        onPress={() => !item.isRead && handleMarkAsRead(item._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationIcon, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.body}</Text>
          <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.notifications')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>
              {markAllAsReadMutation.isPending ? t('more.notifications.marking') : t('more.notifications.markAllRead')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tab, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>{t('more.notifications.filters.all')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'unread' && styles.tabActive]}
            onPress={() => setFilter('unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}>{t('more.notifications.filters.unread')}</Text>
            {filter !== 'unread' && unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'read' && styles.tabActive]}
            onPress={() => setFilter('read')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === 'read' && styles.tabTextActive]}>{t('more.notifications.filters.read')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notifications List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.notifications.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {filter === 'unread'
                  ? t('more.notifications.empty.unread')
                  : filter === 'read'
                  ? t('more.notifications.empty.read')
                  : t('more.notifications.empty.all')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  filterTabs: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textTransform: 'capitalize',
  },
});

