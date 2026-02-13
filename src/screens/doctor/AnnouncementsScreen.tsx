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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as announcementApi from '../../services/announcement';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export const AnnouncementsScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [refreshing, setRefreshing] = useState(false);

  // Fetch announcements for doctor
  const { data: announcementsData, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorAnnouncements', filter, page],
    queryFn: () => {
      const params: any = {
        page,
        limit,
      };
      if (filter === 'unread') {
        params.isRead = false;
      }
      return announcementApi.getDoctorAnnouncements(params);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['announcementUnreadCount'],
    queryFn: () => announcementApi.getUnreadAnnouncementCount(),
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => announcementApi.markAnnouncementAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['announcementUnreadCount'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('doctor.announcements.toasts.markedAsRead'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('doctor.announcements.errors.failedToMarkAsRead');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Extract data from response
  const announcements = useMemo(() => {
    if (!announcementsData?.data) return [];
    return announcementsData.data.announcements || [];
  }, [announcementsData]);

  const pagination = useMemo(() => {
    if (!announcementsData?.data) return null;
    return announcementsData.data.pagination || null;
  }, [announcementsData]);

  const unreadCount = useMemo(() => {
    if (!unreadCountData?.data) return 0;
    return unreadCountData.data.unreadCount || 0;
  }, [unreadCountData]);

  // Filter announcements based on selected filter
  const filteredAnnouncements = useMemo(() => {
    let filtered = [...announcements];

    if (filter === 'unread') {
      filtered = filtered.filter((a) => !a.isRead);
    } else if (filter === 'pinned') {
      filtered = filtered.filter((a) => a.isPinned);
    }

    // Sort: pinned first, then by priority (URGENT > IMPORTANT > NORMAL), then by date
    return filtered.sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Priority order
      const priorityOrder: Record<string, number> = { URGENT: 3, IMPORTANT: 2, NORMAL: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      if (aPriority !== bPriority) return bPriority - aPriority;

      // Then by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [announcements, filter]);

  const pinnedCount = useMemo(() => {
    return announcements.filter((a) => a.isPinned).length;
  }, [announcements]);

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString(i18n.language || 'en-US', options);
  };

  // Format time
  const formatTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language || 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getPriorityLabel = (priority: string): string => {
    const normalized = (priority || '').toLowerCase();
    return t(`doctor.announcements.priority.${normalized}`, { defaultValue: priority });
  };

  const getTypeLabel = (announcementType: string): string => {
    const normalized = (announcementType || '').toLowerCase();
    return t(`doctor.announcements.types.${normalized}`, { defaultValue: announcementType });
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    const colors_map: Record<string, string> = {
      URGENT: colors.error,
      IMPORTANT: colors.warning,
      NORMAL: colors.success,
    };
    return colors_map[priority] || colors.textSecondary;
  };

  // Get priority icon
  const getPriorityIcon = (priority: string): string => {
    const icons: Record<string, string> = {
      URGENT: 'alert-circle',
      IMPORTANT: 'information-circle',
      NORMAL: 'checkmark-circle',
    };
    return icons[priority] || 'information-circle';
  };

  // Get announcement type badge color
  const getTypeBadgeColor = (announcementType: string): string => {
    const colors_map: Record<string, string> = {
      BROADCAST: colors.primary,
      TARGETED: colors.textSecondary,
    };
    return colors_map[announcementType] || colors.textSecondary;
  };

  // Handle mark as read
  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Handle filter change
  const handleFilterChange = (newFilter: 'all' | 'unread' | 'pinned') => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
      setPage(newPage);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('doctor.announcements.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('doctor.announcements.errorTitle')}</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              t('doctor.announcements.errors.failedToLoadAnnouncements')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>{t('doctor.announcements.stats.unread', { count: unreadCount })}</Text>
        </View>
        <View style={[styles.statBadge, styles.primaryBadge]}>
          <Text style={styles.statBadgeText}>{t('doctor.announcements.stats.pinned', { count: pinnedCount })}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => handleFilterChange('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              {t('doctor.announcements.tabs.all', { count: announcements.length })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
            onPress={() => handleFilterChange('unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
              {t('doctor.announcements.tabs.unread', { count: unreadCount })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pinned' && styles.filterTabActive]}
            onPress={() => handleFilterChange('pinned')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'pinned' && styles.filterTabTextActive]}>
              {t('doctor.announcements.tabs.pinned', { count: pinnedCount })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Announcements List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredAnnouncements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>{t('doctor.announcements.empty.title')}</Text>
            <Text style={styles.emptyStateText}>{t('doctor.announcements.empty.subtitle')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.announcementsList}>
              {filteredAnnouncements.map((announcement) => (
                <View
                  key={announcement._id}
                  style={[
                    styles.announcementCard,
                    announcement.isPinned && styles.pinnedCard,
                    !announcement.isRead && styles.unreadCard,
                    announcement.priority === 'URGENT' && styles.urgentCard,
                  ]}
                >
                  <View style={styles.announcementHeader}>
                    <View style={styles.announcementIcon}>
                      <Ionicons
                        name={getPriorityIcon(announcement.priority) as any}
                        size={24}
                        color={getPriorityColor(announcement.priority)}
                      />
                    </View>
                    <View style={styles.announcementContent}>
                      <View style={styles.announcementTitleRow}>
                        <View style={styles.titleContent}>
                          {announcement.isPinned && (
                            <Ionicons name="pin" size={16} color={colors.primary} style={styles.iconMargin} />
                          )}
                          {announcement.priority === 'URGENT' && (
                            <Ionicons name="alert-circle" size={16} color={colors.error} style={styles.iconMargin} />
                          )}
                          <Text style={styles.announcementTitle}>{announcement.title}</Text>
                          {!announcement.isRead && (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>{t('doctor.announcements.badges.new')}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.announcementMeta}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: `${getTypeBadgeColor(announcement.announcementType)}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              { color: getTypeBadgeColor(announcement.announcementType) },
                            ]}
                          >
                            {getTypeLabel(announcement.announcementType)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: `${getPriorityColor(announcement.priority)}20` },
                          ]}
                        >
                          <Text style={[styles.priorityBadgeText, { color: getPriorityColor(announcement.priority) }]}>
                            {getPriorityLabel(announcement.priority)}
                          </Text>
                        </View>
                        <Text style={styles.announcementDate}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />{' '}
                          {formatDate(announcement.createdAt)} {t('doctor.announcements.meta.at')} {formatTime(announcement.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.announcementMessage}>{announcement.message}</Text>
                      {!announcement.isRead && (
                        <TouchableOpacity
                          style={styles.markReadButton}
                          onPress={() => handleMarkAsRead(announcement._id)}
                          activeOpacity={0.7}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Text style={styles.markReadButtonText}>
                            {markAsReadMutation.isPending
                              ? t('doctor.announcements.actions.marking')
                              : t('doctor.announcements.actions.markAsRead')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                  onPress={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <Text
                    style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}
                  >
                    {t('doctor.announcements.pagination.previous')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  {t('doctor.announcements.pagination.pageOf', { page, pages: pagination.pages })}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, page === pagination.pages && styles.paginationButtonDisabled]}
                  onPress={() => handlePageChange(page + 1)}
                  disabled={page === pagination.pages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      page === pagination.pages && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    {t('doctor.announcements.pagination.next')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('doctor.announcements.info.title')}</Text>
            <Text style={styles.infoText}>
              {t('doctor.announcements.info.text')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  primaryBadge: {
    backgroundColor: colors.primary,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterTabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  filterTabTextActive: {
    color: colors.textWhite,
  },
  announcementsList: {
    padding: 16,
    gap: 12,
  },
  announcementCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinnedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  unreadCard: {
    backgroundColor: colors.primaryLight + '10',
  },
  urgentCard: {
    borderColor: colors.error,
  },
  announcementHeader: {
    flexDirection: 'row',
  },
  announcementIcon: {
    marginRight: 12,
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  iconMargin: {
    marginRight: 4,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textWhite,
  },
  announcementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  announcementDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  announcementMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  markReadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  markReadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: colors.textWhite,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationText: {
    fontSize: 14,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
