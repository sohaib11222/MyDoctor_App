import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Announcement {
  id: number;
  title: string;
  message: string;
  date: string;
  time: string;
  type: 'feature' | 'maintenance' | 'payment' | 'policy' | 'reminder';
  priority: 'high' | 'medium' | 'low';
  pinned: boolean;
  read: boolean;
  urgent: boolean;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: 'New Feature: Video Consultations Available',
    message:
      'We are excited to announce that video consultations are now available for all doctors. You can now conduct virtual appointments with your patients.',
    date: '15 Nov 2024',
    time: '10:30 AM',
    type: 'feature',
    priority: 'high',
    pinned: true,
    read: false,
    urgent: true,
  },
  {
    id: 2,
    title: 'System Maintenance Scheduled',
    message:
      'Scheduled maintenance will occur on November 20, 2024 from 2:00 AM to 4:00 AM EST. The platform will be temporarily unavailable during this time.',
    date: '14 Nov 2024',
    time: '3:15 PM',
    type: 'maintenance',
    priority: 'medium',
    pinned: true,
    read: true,
    urgent: false,
  },
  {
    id: 3,
    title: 'Payment Processing Update',
    message:
      'Your payment for November has been processed successfully. You can view the details in your account section.',
    date: '13 Nov 2024',
    time: '9:00 AM',
    type: 'payment',
    priority: 'low',
    pinned: false,
    read: false,
    urgent: false,
  },
  {
    id: 4,
    title: 'New Patient Review Guidelines',
    message:
      'Please review the updated patient review guidelines. These changes will help improve the quality of patient feedback.',
    date: '12 Nov 2024',
    time: '11:45 AM',
    type: 'policy',
    priority: 'medium',
    pinned: false,
    read: true,
    urgent: false,
  },
  {
    id: 5,
    title: 'Holiday Schedule Reminder',
    message:
      'Reminder: The platform will operate with limited support during the holiday season. Please plan your appointments accordingly.',
    date: '10 Nov 2024',
    time: '2:30 PM',
    type: 'reminder',
    priority: 'low',
    pinned: false,
    read: true,
    urgent: false,
  },
];

const getTypeBadgeColor = (type: string) => {
  const colors_map: Record<string, string> = {
    feature: colors.primary,
    maintenance: colors.warning,
    payment: colors.success,
    policy: colors.info || colors.primary,
    reminder: colors.textSecondary,
  };
  return colors_map[type] || colors.textSecondary;
};

const getPriorityIcon = (priority: string) => {
  const icons: Record<string, string> = {
    high: 'alert-circle',
    medium: 'information-circle',
    low: 'checkmark-circle',
  };
  return icons[priority] || 'information-circle';
};

const getPriorityColor = (priority: string) => {
  const colors_map: Record<string, string> = {
    high: colors.error,
    medium: colors.warning,
    low: colors.success,
  };
  return colors_map[priority] || colors.textSecondary;
};

export const AnnouncementsScreen = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned'>('all');

  const filteredAnnouncements = () => {
    let filtered = announcements;
    if (filter === 'unread') {
      filtered = filtered.filter((a) => !a.read);
    } else if (filter === 'pinned') {
      filtered = filtered.filter((a) => a.pinned);
    }
    // Sort: pinned first, then by date
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };

  const markAsRead = (id: number) => {
    // TODO: Update announcement read status via API
    console.log('Marking announcement as read:', id);
  };

  const togglePin = (id: number) => {
    // TODO: Toggle pin status via API
    console.log('Toggling pin for announcement:', id);
  };

  const unreadCount = announcements.filter((a) => !a.read).length;
  const pinnedCount = announcements.filter((a) => a.pinned).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>{unreadCount} Unread</Text>
        </View>
        <View style={[styles.statBadge, styles.primaryBadge]}>
          <Text style={styles.statBadgeText}>{pinnedCount} Pinned</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All ({announcements.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
            onPress={() => setFilter('unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pinned' && styles.filterTabActive]}
            onPress={() => setFilter('pinned')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === 'pinned' && styles.filterTabTextActive]}>
              Pinned ({pinnedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Announcements List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredAnnouncements().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>No announcements found</Text>
            <Text style={styles.emptyStateText}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {filteredAnnouncements().map((announcement) => (
              <View
                key={announcement.id}
                style={[
                  styles.announcementCard,
                  announcement.pinned && styles.pinnedCard,
                  !announcement.read && styles.unreadCard,
                  announcement.urgent && styles.urgentCard,
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
                        {announcement.pinned && (
                          <Ionicons name="pin" size={16} color={colors.primary} style={styles.iconMargin} />
                        )}
                        {announcement.urgent && (
                          <Ionicons name="alert-circle" size={16} color={colors.error} style={styles.iconMargin} />
                        )}
                        <Text style={styles.announcementTitle}>{announcement.title}</Text>
                        {!announcement.read && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>New</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => togglePin(announcement.id)}
                        activeOpacity={0.7}
                        style={styles.pinButton}
                      >
                        <Ionicons
                          name={announcement.pinned ? 'pin' : 'pin-outline'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.announcementMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: `${getTypeBadgeColor(announcement.type)}20` }]}>
                        <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(announcement.type) }]}>
                          {announcement.type}
                        </Text>
                      </View>
                      <Text style={styles.announcementDate}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} /> {announcement.date}{' '}
                        at {announcement.time}
                      </Text>
                    </View>
                    <Text style={styles.announcementMessage}>{announcement.message}</Text>
                    {!announcement.read && (
                      <TouchableOpacity
                        style={styles.markReadButton}
                        onPress={() => markAsRead(announcement.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.markReadButtonText}>Mark as Read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Announcements</Text>
            <Text style={styles.infoText}>
              Important announcements from the platform will appear here. Pinned announcements stay at the top, and
              urgent announcements are highlighted. Make sure to read all announcements to stay updated.
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
  pinButton: {
    padding: 4,
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

