import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as notificationApi from '../../services/notification';
import * as profileApi from '../../services/profile';
import * as subscriptionApi from '../../services/subscription';
import * as weeklyScheduleApi from '../../services/weeklySchedule';

type MoreScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const MoreScreen = () => {
  const navigation = useNavigation<MoreScreenNavigationProp>();
  const { user, logout } = useAuth();

  // Fetch unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: () => notificationApi.getUnreadNotificationsCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch weekly schedule to check if timings are set (for doctors)
  const { data: weeklySchedule } = useQuery({
    queryKey: ['weeklySchedule'],
    queryFn: async () => {
      const response = await weeklyScheduleApi.getWeeklySchedule();
      return response.data || response;
    },
    enabled: user?.role === 'doctor' && !!user,
    retry: 1,
  });

  // Fetch subscription to check if active subscription exists (for doctors)
  const { data: mySubscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: async () => {
      const response = await subscriptionApi.getMySubscription();
      return response.data || response;
    },
    enabled: user?.role === 'doctor' && !!user,
    retry: 1,
  });

  // Check if timings are set
  const hasTimings = useMemo(() => {
    if (!weeklySchedule) return false;
    const schedule = (weeklySchedule as any)?.data || weeklySchedule;
    return schedule && schedule.days && schedule.days.some((day: any) => 
      day.timeSlots && day.timeSlots.length > 0
    );
  }, [weeklySchedule]);

  // Check if subscription is active
  const hasActiveSubscription = useMemo(() => {
    if (!mySubscription) return false;
    const subscription = (mySubscription as any)?.data || mySubscription;
    return subscription?.hasActiveSubscription === true || 
      (subscription?.subscriptionPlan && subscription?.subscriptionExpiresAt && 
       new Date(subscription.subscriptionExpiresAt) > new Date());
  }, [mySubscription]);

  const getMenuItems = () => {
    if ((user as any)?.role === 'ADMIN' || (user as any)?.role === 'admin') {
      return [
        { id: 1, title: 'All Orders', icon: 'shopping-bag', screen: 'AdminOrders' as keyof MoreStackParamList },
        { id: 2, title: 'Profile', icon: 'user', screen: 'Profile' as keyof MoreStackParamList },
        { id: 3, title: 'Change Password', icon: 'lock', screen: 'ChangePassword' as keyof MoreStackParamList },
        { id: 4, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
      ];
    }

    if (user?.role === 'pharmacy') {
      return [
        { id: 1, title: 'Profile', icon: 'user', screen: 'PharmacyProfile' as keyof MoreStackParamList },
        { id: 2, title: 'Payout Settings', icon: 'dollar-sign', screen: 'PayoutSettings' as keyof MoreStackParamList },
        { id: 3, title: 'Change Password', icon: 'lock', screen: 'ChangePassword' as keyof MoreStackParamList },
        { id: 4, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
      ];
    }
  
    if (user?.role === 'doctor') {
      return [
        { id: 1, title: 'Dashboard', icon: 'grid', screen: 'DoctorDashboard' as keyof MoreStackParamList },
        { id: 2, title: 'My Patients', icon: 'users', screen: 'MyPatients' as keyof MoreStackParamList },
        { id: 3, title: 'Reviews', icon: 'star', screen: 'Reviews' as keyof MoreStackParamList },
        { id: 4, title: 'Reschedule Requests', icon: 'calendar', screen: 'DoctorRescheduleRequests' as keyof MoreStackParamList },
        { id: 5, title: 'Invoices', icon: 'file-text', screen: 'Invoices' as keyof MoreStackParamList },
        { id: 6, title: 'Subscription', icon: 'credit-card', screen: 'Subscription' as keyof MoreStackParamList, showDanger: true },
        { id: 6.5, title: 'Payout Settings', icon: 'dollar-sign', screen: 'PayoutSettings' as keyof MoreStackParamList },
        { id: 7, title: 'Available Timings', icon: 'clock', screen: 'AvailableTimings' as any, showDanger: true, isAppointmentsStack: true },
        { id: 8, title: 'Announcements', icon: 'bell', screen: 'Announcements' as keyof MoreStackParamList },
        { id: 9, title: 'Pharmacy Management', icon: 'package', screen: 'PharmacyManagement' as keyof MoreStackParamList },
        { id: 10, title: 'Orders', icon: 'shopping-bag', screen: 'PharmacyOrders' as keyof MoreStackParamList },
        { id: 11, title: 'Profile', icon: 'user', screen: 'Profile' as keyof MoreStackParamList },
        { id: 12, title: 'Profile Settings', icon: 'edit', screen: 'ProfileSettings' as keyof MoreStackParamList },
        // { id: 12, title: 'Social Media Links', icon: 'share-2', screen: 'SocialLinks' as keyof MoreStackParamList },
        // { id: 13, title: 'Settings', icon: 'settings', screen: 'Settings' as keyof MoreStackParamList },
        { id: 14, title: 'Change Password', icon: 'lock', screen: 'ChangePassword' as keyof MoreStackParamList },
        { id: 15, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
      ];
    } else {
      return [
        { id: 1, title: 'Dashboard', icon: 'grid', screen: 'PatientDashboard' as keyof MoreStackParamList },
        // { id: 2, title: 'Profile', icon: 'user', screen: 'Profile' as keyof MoreStackParamList },
        { id: 3, title: 'Profile Settings', icon: 'edit', screen: 'PatientProfileSettings' as keyof MoreStackParamList },
        // { id: 4, title: 'Settings', icon: 'settings', screen: 'Settings' as keyof MoreStackParamList },
        { id: 5, title: 'Change Password', icon: 'lock', screen: 'ChangePassword' as keyof MoreStackParamList },
        { id: 6, title: 'Medical Records', icon: 'file-text', screen: 'MedicalRecords' as keyof MoreStackParamList },
        // { id: 7, title: 'Dependents', icon: 'users', screen: 'Dependents' as keyof MoreStackParamList },
        { id: 8, title: 'Favourites', icon: 'heart', screen: 'Favourites' as keyof MoreStackParamList },
        { id: 9, title: 'Reschedule Requests', icon: 'calendar', screen: 'PatientRescheduleRequests' as keyof MoreStackParamList },
        { id: 10, title: 'Order History', icon: 'shopping-bag', screen: 'OrderHistory' as keyof MoreStackParamList },
        { id: 11, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
        { id: 12, title: 'Invoices', icon: 'file-text', screen: 'Invoices' as keyof MoreStackParamList },
        // { id: 11, title: 'Documents', icon: 'folder', screen: 'Documents' as keyof MoreStackParamList },
      ];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item: any) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              // Handle AvailableTimings navigation (it's in Appointments stack)
              if ((item as any).isAppointmentsStack) {
                try {
                  // Get the parent tab navigator
                  const parent = navigation.getParent();
                  if (parent) {
                    // Navigate to Appointments tab and then to the specific screen
                    (parent as any).navigate('Appointments', {
                      screen: item.screen,
                      params: undefined,
                    });
                  } else {
                    // Fallback: navigate to Appointments tab
                    (navigation as any).navigate('Appointments' as any);
                  }
                } catch (error) {
                  // Fallback: try direct navigation to Appointments tab
                  console.warn('Navigation error:', error);
                  try {
                    (navigation as any).navigate('Appointments' as any);
                  } catch (e) {
                    console.error('Failed to navigate:', e);
                  }
                }
              } else if (item.screen === 'PatientRescheduleRequests' || item.screen === 'DoctorRescheduleRequests') {
                // Navigate to reschedule requests screens in More stack
                navigation.navigate(item.screen as any);
              } else {
                navigation.navigate(item.screen as any);
              }
            }}
          >
            <Feather name={item.icon as any} size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>{item.title}</Text>
            <View style={styles.menuItemRight}>
              {item.screen === 'Notifications' && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
              {/* Danger sign for Subscription if no active subscription */}
              {item.screen === 'Subscription' && user?.role === 'doctor' && !hasActiveSubscription && (
                <Ionicons name="warning" size={18} color={colors.error} style={{ marginRight: 4 }} />
              )}
              {/* Danger sign for Available Timings if no timings set */}
              {item.screen === 'AvailableTimings' && user?.role === 'doctor' && !hasTimings && (
                <Ionicons name="warning" size={18} color={colors.error} style={{ marginRight: 4 }} />
              )}
              <Feather name="chevron-right" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={24} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textWhite,
    opacity: 0.9,
  },
  menuSection: {
    backgroundColor: colors.background,
    marginTop: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 20,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 12,
  },
});

