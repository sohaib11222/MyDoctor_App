import React, { useState, useEffect } from 'react';
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
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import * as profileApi from '../../services/profile';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

interface SocialLinks {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  website: string;
}

const socialPlatforms = [
  { key: 'facebook' as keyof SocialLinks, labelKey: 'more.socialLinks.platforms.facebook', icon: 'logo-facebook' },
  { key: 'instagram' as keyof SocialLinks, labelKey: 'more.socialLinks.platforms.instagram', icon: 'logo-instagram' },
  { key: 'linkedin' as keyof SocialLinks, labelKey: 'more.socialLinks.platforms.linkedin', icon: 'logo-linkedin' },
  { key: 'twitter' as keyof SocialLinks, labelKey: 'more.socialLinks.platforms.twitter', icon: 'logo-twitter' },
  { key: 'website' as keyof SocialLinks, labelKey: 'more.socialLinks.platforms.website', icon: 'globe-outline' },
];

export const SocialLinksScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();

  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    website: '',
  });

  // Get user ID (support both _id and id)
  const userId = user?._id || user?.id;

  // Fetch doctor profile
  const { data: doctorProfile, isLoading, error, refetch } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: async () => {
      // Ensure user is available before making the call
      if (!user || !userId) {
        throw new Error(t('more.socialLinks.userNotAuthenticated'));
      }
      return profileApi.getDoctorProfile();
    },
    enabled: !!user && !!userId,
    retry: 1,
  });

  // Update doctor profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure user is available before making the call
      if (!user || !userId) {
        throw new Error(t('more.socialLinks.userNotAuthenticated'));
      }
      return profileApi.updateDoctorProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.socialLinks.updatedBody'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.socialLinks.failedToUpdate');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Initialize social links from profile
  useEffect(() => {
    if (doctorProfile?.data) {
      const profile = doctorProfile.data as profileApi.DoctorProfile;
      if (profile.socialLinks) {
        setSocialLinks({
          facebook: profile.socialLinks.facebook || '',
          instagram: profile.socialLinks.instagram || '',
          linkedin: profile.socialLinks.linkedin || '',
          twitter: profile.socialLinks.twitter || '',
          website: profile.socialLinks.website || '',
        });
      } else {
        setSocialLinks({
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
          website: '',
        });
      }
    }
  }, [doctorProfile]);

  // Handle social link change
  const handleLinkChange = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submit
  const handleSubmit = () => {
    // Prepare update data - only include non-empty URLs, validate URLs
    const socialLinksData: Partial<SocialLinks> = {};

    // Validate and add URLs only if they're not empty
    for (const platform of socialPlatforms) {
      const value = socialLinks[platform.key]?.trim();
      if (value) {
        if (isValidUrl(value)) {
          socialLinksData[platform.key] = value;
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t(platform.labelKey) }),
          });
          return;
        }
      }
    }

    const updateData = {
      socialLinks: socialLinksData,
    };

    updateProfileMutation.mutate(updateData);
  };

  // Handle cancel
  const handleCancel = () => {
    if (doctorProfile?.data) {
      const profile = doctorProfile.data as profileApi.DoctorProfile;
      if (profile.socialLinks) {
        setSocialLinks({
          facebook: profile.socialLinks.facebook || '',
          instagram: profile.socialLinks.instagram || '',
          linkedin: profile.socialLinks.linkedin || '',
          twitter: profile.socialLinks.twitter || '',
          website: profile.socialLinks.website || '',
        });
      } else {
        setSocialLinks({
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
          website: '',
        });
      }
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
          <Text style={styles.loadingText}>{t('more.socialLinks.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{t('more.socialLinks.errorLoadingProfileTitle')}</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              t('more.socialLinks.failedToLoadProfile')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.socialLinks')}</Text>
          <Text style={styles.sectionSubtitle}>{t('more.socialLinks.subtitle')}</Text>

          {socialPlatforms.map((platform) => (
            <View key={platform.key} style={styles.linkContainer}>
              <View style={styles.linkHeader}>
                <Ionicons name={platform.icon as any} size={24} color={colors.primary} />
                <Text style={styles.linkLabel}>{t(platform.labelKey)}</Text>
              </View>
              <Input
                placeholder={t('more.socialLinks.addUrlPlaceholder', { platform: t(platform.labelKey) })}
                value={socialLinks[platform.key]}
                onChangeText={(text) => handleLinkChange(platform.key, text)}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('more.socialLinks.aboutTitle')}</Text>
            <Text style={styles.infoText}>
              {t('more.socialLinks.aboutBody')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Button
            title={updateProfileMutation.isPending ? t('common.saving') : t('common.saveChanges')}
            onPress={handleSubmit}
            disabled={updateProfileMutation.isPending}
            style={styles.saveButton}
          />
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
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  linkContainer: {
    marginBottom: 20,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
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
  actionsSection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
  },
});

