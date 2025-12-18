import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Feather } from '@expo/vector-icons';

type MoreScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const MoreScreen = () => {
  const navigation = useNavigation<MoreScreenNavigationProp>();
  const { user, logout } = useAuth();

  const getMenuItems = () => {
    if (user?.role === 'pharmacy') {
      return [
        { id: 1, title: 'Profile', icon: 'user', screen: 'PharmacyProfile' as keyof MoreStackParamList },
        { id: 2, title: 'Settings', icon: 'settings', screen: 'PharmacySettings' as keyof MoreStackParamList },
      ];
    } else if (user?.role === 'doctor') {
      return [
        { id: 1, title: 'Dashboard', icon: 'grid', screen: 'DoctorDashboard' as keyof MoreStackParamList },
        { id: 2, title: 'My Patients', icon: 'users', screen: 'MyPatients' as keyof MoreStackParamList },
        { id: 3, title: 'Reviews', icon: 'star', screen: 'Reviews' as keyof MoreStackParamList },
        { id: 4, title: 'Invoices', icon: 'file-text', screen: 'Invoices' as keyof MoreStackParamList },
        { id: 5, title: 'Subscription', icon: 'credit-card', screen: 'Subscription' as keyof MoreStackParamList },
        { id: 6, title: 'Announcements', icon: 'bell', screen: 'Announcements' as keyof MoreStackParamList },
        { id: 7, title: 'Profile', icon: 'user', screen: 'Profile' as keyof MoreStackParamList },
        { id: 8, title: 'Settings', icon: 'settings', screen: 'Settings' as keyof MoreStackParamList },
        { id: 9, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
      ];
    } else {
      return [
        { id: 1, title: 'Dashboard', icon: 'grid', screen: 'PatientDashboard' as keyof MoreStackParamList },
        { id: 2, title: 'Profile', icon: 'user', screen: 'Profile' as keyof MoreStackParamList },
        { id: 3, title: 'Settings', icon: 'settings', screen: 'Settings' as keyof MoreStackParamList },
        { id: 4, title: 'Medical Records', icon: 'file-text', screen: 'MedicalRecords' as keyof MoreStackParamList },
        { id: 5, title: 'Dependents', icon: 'users', screen: 'Dependents' as keyof MoreStackParamList },
        { id: 6, title: 'Favourites', icon: 'heart', screen: 'Favourites' as keyof MoreStackParamList },
        { id: 7, title: 'Notifications', icon: 'bell', screen: 'Notifications' as keyof MoreStackParamList },
        { id: 8, title: 'Invoices', icon: 'file-text', screen: 'Invoices' as keyof MoreStackParamList },
        { id: 9, title: 'Documents', icon: 'folder', screen: 'Documents' as keyof MoreStackParamList },
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
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Feather name={item.icon as any} size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>{item.title}</Text>
            <Feather name="chevron-right" size={20} color={colors.textLight} />
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

