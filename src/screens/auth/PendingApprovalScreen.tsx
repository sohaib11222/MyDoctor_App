import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as userApi from '../../services/user';
import Toast from 'react-native-toast-message';

type PendingApprovalScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const PendingApprovalScreen = () => {
  const navigation = useNavigation<PendingApprovalScreenNavigationProp>();
  const { user, logout, updateUser } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Check user status from AuthContext first
        if (user) {
          const status = user.status?.toUpperCase();
          setCurrentStatus(status || 'PENDING');

          if (status === 'APPROVED') {
            // Doctor is approved, redirect to dashboard
            Toast.show({
              type: 'success',
              text1: 'Account Approved',
              text2: 'Your account has been approved! Redirecting to dashboard...',
            });
            // Navigation will be handled by AppNavigator based on user status
            setCheckingStatus(false);
            return;
          } else if (status === 'REJECTED' || status === 'BLOCKED') {
            // Doctor is rejected or blocked
            Toast.show({
              type: 'error',
              text1: 'Account Status',
              text2: 'Your account has been rejected or blocked. Please contact support.',
            });
            setCheckingStatus(false);
            return;
          }
        }

        // If user status is not in context, try to get from API
        if (user?._id || user?.id) {
          try {
            const userId = user._id || user.id;
            // Get user by ID (requires authentication token)
            const userData = await userApi.getUserById(userId);
            const userStatus = userData.status?.toUpperCase();

            if (userStatus) {
              setCurrentStatus(userStatus);

              // Update user in context
              await updateUser({
                ...user,
                status: userStatus as any,
                isVerified: userStatus === 'APPROVED',
                verificationStatus:
                  userStatus === 'APPROVED'
                    ? 'approved'
                    : userStatus === 'REJECTED'
                    ? 'rejected'
                    : 'pending',
              });

              if (userStatus === 'APPROVED') {
                Toast.show({
                  type: 'success',
                  text1: 'Account Approved',
                  text2: 'Your account has been approved! Redirecting to dashboard...',
                });
                setCheckingStatus(false);
                return;
              } else if (userStatus === 'REJECTED' || userStatus === 'BLOCKED') {
                Toast.show({
                  type: 'error',
                  text1: 'Account Status',
                  text2: 'Your account has been rejected or blocked. Please contact support.',
                });
                setCheckingStatus(false);
                return;
              }
            }
          } catch (apiError) {
            console.error('Error fetching user status:', apiError);
            // If API call fails, use status from context
            setCurrentStatus(user?.status?.toUpperCase() || 'PENDING');
          }
        }

        setCheckingStatus(false);
      } catch (error) {
        console.error('Error checking approval status:', error);
        setCheckingStatus(false);
      }
    };

    checkApprovalStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000);
    return () => clearInterval(interval);
  }, [navigation, user, updateUser]);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      if (!user?._id && !user?.id) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User information not available. Please login again.',
        });
        setCheckingStatus(false);
        return;
      }

      const userId = user._id || user.id;

      // Try to get user by ID
      try {
        const userData = await userApi.getUserById(userId);
        const userStatus = userData.status?.toUpperCase();

        if (userStatus) {
          setCurrentStatus(userStatus);

          // Update user in context
          await updateUser({
            ...user,
            status: userStatus as any,
            isVerified: userStatus === 'APPROVED',
            verificationStatus:
              userStatus === 'APPROVED'
                ? 'approved'
                : userStatus === 'REJECTED'
                ? 'rejected'
                : 'pending',
          });

          if (userStatus === 'APPROVED') {
            Toast.show({
              type: 'success',
              text1: 'Account Approved',
              text2: 'Your account has been approved! Redirecting to dashboard...',
            });
            setCheckingStatus(false);
            return;
          } else if (userStatus === 'REJECTED' || userStatus === 'BLOCKED') {
            Toast.show({
              type: 'error',
              text1: 'Account Status',
              text2: 'Your account has been rejected or blocked.',
            });
          } else {
            Toast.show({
              type: 'info',
              text1: 'Status Update',
              text2: 'Your account is still pending approval.',
            });
          }
        } else {
          Toast.show({
            type: 'warning',
            text1: 'Status Unknown',
            text2: 'Unable to determine account status.',
          });
        }
      } catch (error: any) {
        console.error('Error fetching user:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to check status. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to check status. Please try again.',
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleUpdateDocuments = () => {
    navigation.navigate('DoctorVerificationUpload');
  };

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="medical" size={60} color={colors.primary} />
          </View>
        </View>

        {checkingStatus ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking your status...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Status Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons name="time-outline" size={48} color={colors.warning} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Pending Admin Approval</Text>
            <Text style={styles.subtitle}>
              Your verification documents have been submitted successfully.
            </Text>

            {/* Status Cards */}
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <View style={styles.statusIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
                <View style={styles.statusContent}>
                  <Text style={styles.statusTitle}>Documents Submitted</Text>
                  <Text style={styles.statusText}>Your verification documents are under review</Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <View style={styles.statusIcon}>
                  <Ionicons name="time-outline" size={24} color={colors.warning} />
                </View>
                <View style={styles.statusContent}>
                  <Text style={styles.statusTitle}>Review in Progress</Text>
                  <Text style={styles.statusText}>Our admin team is reviewing your documents</Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <View style={styles.statusIcon}>
                  <Ionicons name="mail-outline" size={24} color={colors.info} />
                </View>
                <View style={styles.statusContent}>
                  <Text style={styles.statusTitle}>Notification</Text>
                  <Text style={styles.statusText}>
                    You will receive an email once your account is approved
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Alert */}
            <View style={styles.infoAlert}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoTitle}>What happens next?</Text>
              </View>
              <Text style={styles.infoText}>
                Our admin team typically reviews verification documents within 24-48 hours.
                Once approved, you'll be able to access your doctor dashboard and start accepting
                appointments.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.checkButton} onPress={handleCheckStatus}>
                <Ionicons name="refresh" size={18} color={colors.textWhite} />
                <Text style={styles.checkButtonText}>Check Status Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.updateButton} onPress={handleUpdateDocuments}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.updateButtonText}>Update Documents</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Support Info */}
            <View style={styles.supportInfo}>
              <Text style={styles.supportText}>
                Need help? <Text style={styles.supportLink}>Contact Support</Text>
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.primaryLight,
  },
  logoContainer: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoAlert: {
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.info,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  supportInfo: {
    alignItems: 'center',
  },
  supportText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  supportLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

