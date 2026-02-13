import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import * as profileApi from '../../services/profile';
import * as uploadApi from '../../services/upload';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import { getNextTab, TabType } from '../../utils/profileSettingsTabs';
import * as specializationApi from '../../services/specialization';
import * as insuranceApi from '../../services/insurance';
import { useTranslation } from 'react-i18next';

type TabTypeLocal = 'basic' | 'specialties' | 'experience' | 'education' | 'awards' | 'clinics' | 'insurance' | 'business' | 'social';

// Helper function to get next tab (fallback if import fails)
const getNextTabLocal = (currentTab: TabTypeLocal): TabTypeLocal | null => {
  const tabOrder: TabTypeLocal[] = ['basic', 'specialties', 'experience', 'education', 'awards', 'clinics', 'insurance', 'business', 'social'];
  const currentIndex = tabOrder.indexOf(currentTab);
  if (currentIndex === -1 || currentIndex === tabOrder.length - 1) {
    return null;
  }
  return tabOrder[currentIndex + 1];
};

export const ProfileSettingsScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabTypeLocal>('basic');
  const experienceCounterRef = useRef(0);
  const educationCounterRef = useRef(0);
  const awardCounterRef = useRef(0);
  const clinicCounterRef = useRef(0);

  // Form state for user profile
  const [userProfileData, setUserProfileData] = useState({
    fullName: '',
    phone: '',
    profileImage: '',
  });

  // Form state for doctor profile
  const [doctorProfileData, setDoctorProfileData] = useState({
    title: '',
    biography: '',
    specializationId: '',
    consultationFees: {
      clinic: '' as string | number,
      online: '' as string | number,
    },
    memberships: [] as Array<{ name: string }>,
    services: [] as Array<{ name: string; price: number }>,
    experience: [] as Array<{ hospital: string; fromYear: string; toYear: string; designation: string }>,
    education: [] as Array<{ degree: string; college: string; year: string }>,
    awards: [] as Array<{ title: string; year: string }>,
    clinics: [] as Array<{
      name: string;
      address: string;
      city: string;
      state: string;
      country: string;
      phone: string;
      lat: number | null;
      lng: number | null;
      images: string[];
      timings: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
    }>,
  });

  // Business hours state (for business tab)
  const [businessHours, setBusinessHours] = useState<Record<string, { startTime: string; endTime: string }>>({});

  // Social links state (for social tab)
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    website: '',
  });

  // Insurance state (for insurance tab)
  const [convenzionato, setConvenzionato] = useState(false);
  const [selectedInsuranceIds, setSelectedInsuranceIds] = useState<string[]>([]);

  // Profile image preview
  const [profileImagePreview, setProfileImagePreview] = useState('');
  // Selected image asset (not uploaded yet)
  const [selectedImageAsset, setSelectedImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Get user ID (support both _id and id)
  const userId = user?._id || user?.id;

  // Fetch user profile
  const { data: userProfile, isLoading: userProfileLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => profileApi.getUserProfile(userId!),
    enabled: !!userId,
  });

  // Fetch doctor profile
  const { data: doctorProfile, isLoading: doctorProfileLoading, refetch: refetchDoctorProfile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: async () => {
      // Ensure user is available before making the call
      if (!user || !userId) {
        throw new Error(t('common.userNotAuthenticated'));
      }
      return profileApi.getDoctorProfile();
    },
    enabled: !!user && !!userId,
    retry: 1,
  });

  // Fetch specializations for specialties tab
  const { data: specializationsData, isLoading: specializationsLoading } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => specializationApi.getAllSpecializations(),
    enabled: activeTab === 'specialties',
    retry: 1,
  });

  const specializations = useMemo(() => {
    if (!specializationsData) return [];
    if (Array.isArray(specializationsData)) return specializationsData;
    const responseData = (specializationsData as any)?.data || specializationsData;
    if (Array.isArray(responseData)) return responseData;
    return (responseData as any)?.data || [];
  }, [specializationsData]);

  // Fetch insurance companies for insurance tab
  const { data: insuranceCompaniesData, isLoading: insuranceLoading } = useQuery({
    queryKey: ['activeInsuranceCompanies'],
    queryFn: () => insuranceApi.getActiveInsuranceCompanies(),
    enabled: activeTab === 'insurance',
    retry: 1,
  });

  const insuranceCompanies = useMemo(() => {
    if (!insuranceCompaniesData) return [];
    if (Array.isArray(insuranceCompaniesData)) return insuranceCompaniesData;
    return [];
  }, [insuranceCompaniesData]);

  // Update user profile mutation
  const updateUserProfileMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.doctorProfileSettings.profileUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.doctorProfileSettings.failedToUpdateProfile');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Update doctor profile mutation
  const updateDoctorProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure user is available before making the call
      if (!user || !userId) {
        throw new Error(t('common.userNotAuthenticated'));
      }
      return profileApi.updateDoctorProfile(data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?._id] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.doctorProfileSettings.doctorProfileUpdatedSuccessfully'),
      });
      
      // Check if profile is still incomplete and navigate to next tab
      try {
        const updatedProfile = await queryClient.fetchQuery({
          queryKey: ['doctorProfile'],
          queryFn: () => profileApi.getDoctorProfile(),
        });
        const profileData = updatedProfile?.data || updatedProfile;
        const isDoctorProfile = (profile: any): profile is profileApi.DoctorProfile => {
          return profile && typeof profile === 'object' && ('profileCompleted' in profile || 'specialization' in profile);
        };
        const isProfileCompleted = isDoctorProfile(profileData) && profileData.profileCompleted === true;
        
        // Only navigate if profile is still incomplete
        if (!isProfileCompleted) {
          try {
            const nextTab = getNextTab(activeTab as TabType);
            if (nextTab) {
              // Small delay to show success message before navigation
              setTimeout(() => {
                setActiveTab(nextTab as TabTypeLocal);
              }, 500);
            }
          } catch (navError) {
            console.error('Error getting next tab:', navError);
            // Fallback: manually determine next tab
            const tabOrder: TabTypeLocal[] = ['basic', 'specialties', 'experience', 'education', 'awards', 'clinics', 'insurance', 'business', 'social'];
            const currentIndex = tabOrder.indexOf(activeTab);
            if (currentIndex >= 0 && currentIndex < tabOrder.length - 1) {
              setTimeout(() => {
                setActiveTab(tabOrder[currentIndex + 1]);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
        // Still try to navigate even if check fails
        try {
          const nextTab = typeof getNextTab === 'function' ? getNextTab(activeTab as TabType) : getNextTabLocal(activeTab);
          if (nextTab) {
            setTimeout(() => {
              setActiveTab(nextTab as TabTypeLocal);
            }, 500);
          }
        } catch (navError) {
          console.error('Error navigating to next tab:', navError);
          // Fallback: use local helper
          const nextTab = getNextTabLocal(activeTab);
          if (nextTab) {
            setTimeout(() => {
              setActiveTab(nextTab);
            }, 500);
          }
        }
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('more.doctorProfileSettings.failedToUpdateDoctorProfile');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Upload profile image function (called on save, not on selection)
  const uploadProfileImage = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    let tempFileUri: string | null = null;
    try {
      // Get MIME type and filename
      const getMimeAndName = (asset: ImagePicker.ImagePickerAsset) => {
        const fileName = asset.fileName || `profile-${Date.now()}.jpg`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mime =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const name = fileName.includes('.') ? fileName : `profile-${Date.now()}.${ext}`;
        return { mime, name };
      };

      const { mime, name } = getMimeAndName(asset);
      tempFileUri = await copyImageToCacheUri(asset.uri, 0, mime);
      const response = await uploadApi.uploadProfileImage({ uri: tempFileUri, mime, name });
      
      const responseData = response?.data || response;
      const relativeUrl = responseData?.url || responseData?.data?.url || response?.url;
      const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      const imageUrl = relativeUrl?.startsWith('http') ? relativeUrl : `${baseURL}${relativeUrl}`;
      
      return imageUrl;
    } finally {
      if (tempFileUri) {
        await deleteCacheFiles([tempFileUri]);
      }
    }
  };

  // Initialize form data when profiles are loaded
  useEffect(() => {
    if (userProfile?.data) {
      const user = userProfile.data as profileApi.UserProfile;
      setUserProfileData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
      });
      setProfileImagePreview(user.profileImage || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (doctorProfile?.data) {
      const profile = doctorProfile.data as profileApi.DoctorProfile;
      const specializationId = typeof profile.specialization === 'object' && profile.specialization?._id
        ? profile.specialization._id
        : (typeof profile.specialization === 'string' ? profile.specialization : '');
      setDoctorProfileData({
        title: profile.title || '',
        biography: profile.biography || '',
        specializationId: specializationId,
        consultationFees: {
          clinic: profile.consultationFees?.clinic || '',
          online: profile.consultationFees?.online || '',
        },
        memberships: profile.memberships || [],
        services: profile.services || [],
        experience: profile.experience || [],
        education: profile.education || [],
        awards: profile.awards || [],
        clinics: profile.clinics || [],
      });

      // Initialize business hours from first clinic
      if (profile.clinics && profile.clinics.length > 0 && profile.clinics[0].timings) {
        const hours: Record<string, { startTime: string; endTime: string }> = {};
        profile.clinics[0].timings.forEach((timing: any) => {
          if (timing.dayOfWeek) {
            hours[timing.dayOfWeek] = {
              startTime: timing.startTime || '',
              endTime: timing.endTime || '',
            };
          }
        });
        setBusinessHours(hours);
      }

      // Initialize social links
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

      // Initialize insurance settings
      setConvenzionato(profile.convenzionato === true);
      if (profile.insuranceCompanies && Array.isArray(profile.insuranceCompanies)) {
        const ids = profile.insuranceCompanies
          .map((ins: any) => {
            if (typeof ins === 'object' && ins !== null) {
              return ins._id || ins.id;
            }
            return ins;
          })
          .filter(Boolean);
        setSelectedInsuranceIds(ids);
      } else {
        setSelectedInsuranceIds([]);
      }
    }
  }, [doctorProfile]);

  // Handle image selection (just store locally, don't upload)
  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        t('more.profileSettings.permissionRequiredTitle'),
        t('more.profileSettings.permissionPhotosBody')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 4 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: t('more.profileSettings.fileTooLargeTitle'),
          text2: t('more.profileSettings.imageSizeBelow4mb'),
        });
        return;
      }
      // Store asset locally and show preview (don't upload yet)
      setSelectedImageAsset(asset);
      setProfileImagePreview(asset.uri);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageAsset(null);
    setProfileImagePreview('');
    setUserProfileData((prev) => ({ ...prev, profileImage: '' }));
  };

  // Handle membership functions
  const handleMembershipChange = (index: number, value: string) => {
    setDoctorProfileData((prev) => {
      const newMemberships = [...prev.memberships];
      if (!newMemberships[index]) {
        newMemberships[index] = { name: '' };
      }
      newMemberships[index].name = value;
      return { ...prev, memberships: newMemberships };
    });
  };

  const handleAddMembership = () => {
    setDoctorProfileData((prev) => ({
      ...prev,
      memberships: [...prev.memberships, { name: '' }],
    }));
  };

  const handleRemoveMembership = (index: number) => {
    setDoctorProfileData((prev) => ({
      ...prev,
      memberships: prev.memberships.filter((_, i) => i !== index),
    }));
  };

  // Handle consultation fee changes
  const handleConsultationFeeChange = (type: 'clinic' | 'online', value: string) => {
    // Keep as string for TextInput, will convert to number on save
    setDoctorProfileData((prev) => ({
      ...prev,
      consultationFees: {
        ...prev.consultationFees,
        [type]: value,
      },
    }));
  };

  // Handle experience functions
  const handleAddExperience = () => {
    const newId = `exp-${Date.now()}-${experienceCounterRef.current++}`;
    setDoctorProfileData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { hospital: '', fromYear: '', toYear: '', designation: '' },
      ],
    }));
  };

  const handleExperienceChange = (index: number, field: string, value: string) => {
    setDoctorProfileData((prev) => {
      const newExperiences = [...prev.experience];
      if (!newExperiences[index]) {
        newExperiences[index] = { hospital: '', fromYear: '', toYear: '', designation: '' };
      }
      newExperiences[index] = { ...newExperiences[index], [field]: value };
      return { ...prev, experience: newExperiences };
    });
  };

  const handleRemoveExperience = (index: number) => {
    Alert.alert(t('more.doctorProfileSettings.alerts.removeExperience.title'), t('more.doctorProfileSettings.alerts.removeExperience.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setDoctorProfileData((prev) => ({
            ...prev,
            experience: prev.experience.filter((_, i) => i !== index),
          }));
        },
      },
    ]);
  };

  // Handle education functions
  const handleAddEducation = () => {
    const newId = `edu-${Date.now()}-${educationCounterRef.current++}`;
    setDoctorProfileData((prev) => ({
      ...prev,
      education: [...prev.education, { degree: '', college: '', year: '' }],
    }));
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    setDoctorProfileData((prev) => {
      const newEducations = [...prev.education];
      if (!newEducations[index]) {
        newEducations[index] = { degree: '', college: '', year: '' };
      }
      newEducations[index] = { ...newEducations[index], [field]: value };
      return { ...prev, education: newEducations };
    });
  };

  const handleRemoveEducation = (index: number) => {
    Alert.alert(t('more.doctorProfileSettings.alerts.removeEducation.title'), t('more.doctorProfileSettings.alerts.removeEducation.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setDoctorProfileData((prev) => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index),
          }));
        },
      },
    ]);
  };

  // Handle awards functions
  const handleAddAward = () => {
    const newId = `award-${Date.now()}-${awardCounterRef.current++}`;
    setDoctorProfileData((prev) => ({
      ...prev,
      awards: [...prev.awards, { title: '', year: '' }],
    }));
  };

  const handleAwardChange = (index: number, field: string, value: string) => {
    setDoctorProfileData((prev) => {
      const newAwards = [...prev.awards];
      if (!newAwards[index]) {
        newAwards[index] = { title: '', year: '' };
      }
      newAwards[index] = { ...newAwards[index], [field]: value };
      return { ...prev, awards: newAwards };
    });
  };

  const handleRemoveAward = (index: number) => {
    Alert.alert(t('more.doctorProfileSettings.alerts.removeAward.title'), t('more.doctorProfileSettings.alerts.removeAward.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setDoctorProfileData((prev) => ({
            ...prev,
            awards: prev.awards.filter((_, i) => i !== index),
          }));
        },
      },
    ]);
  };

  // Handle clinic functions
  const handleAddClinic = () => {
    const newId = `clinic-${Date.now()}-${clinicCounterRef.current++}`;
    setDoctorProfileData((prev) => ({
      ...prev,
      clinics: [
        ...prev.clinics,
        {
          name: '',
          address: '',
          city: '',
          state: '',
          country: '',
          phone: '',
          lat: null,
          lng: null,
          images: [],
          timings: [],
        },
      ],
    }));
  };

  const handleClinicChange = (index: number, field: string, value: string | number | null) => {
    setDoctorProfileData((prev) => {
      const newClinics = [...prev.clinics];
      if (!newClinics[index]) {
        newClinics[index] = {
          name: '',
          address: '',
          city: '',
          state: '',
          country: '',
          phone: '',
          lat: null,
          lng: null,
          images: [],
          timings: [],
        };
      }
      newClinics[index] = { ...newClinics[index], [field]: value };
      return { ...prev, clinics: newClinics };
    });
  };

  const handleRemoveClinic = (index: number) => {
    Alert.alert(t('more.doctorProfileSettings.alerts.removeClinic.title'), t('more.doctorProfileSettings.alerts.removeClinic.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setDoctorProfileData((prev) => ({
            ...prev,
            clinics: prev.clinics.filter((_, i) => i !== index),
          }));
        },
      },
    ]);
  };

  // Handle business hours
  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // Handle social link change
  const handleLinkChange = (platform: keyof typeof socialLinks, value: string) => {
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

  // Handle submit based on active tab
  const handleSubmit = async () => {
    if (activeTab === 'basic') {
      // Validate required fields
      if (!userProfileData.fullName || !userProfileData.phone) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('more.doctorProfileSettings.validation.fillRequiredFields'),
        });
        return;
      }

      // Upload image first if a new one is selected
      let imageUrl = userProfileData.profileImage;
      if (selectedImageAsset) {
        try {
          imageUrl = await uploadProfileImage(selectedImageAsset);
          setSelectedImageAsset(null); // Clear selected asset after upload
          setUserProfileData((prev) => ({ ...prev, profileImage: imageUrl }));
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || error?.message || t('more.doctorProfileSettings.failedToUploadImage');
          Toast.show({
            type: 'error',
            text1: t('more.doctorProfileSettings.uploadErrorTitle'),
            text2: errorMessage,
          });
          return; // Don't proceed with profile update if image upload fails
        }
      }

      // Prepare user profile data
      const userUpdateData: any = {};
      if (userProfileData.fullName) userUpdateData.fullName = userProfileData.fullName;
      if (userProfileData.phone) userUpdateData.phone = userProfileData.phone;
      if (imageUrl && imageUrl.trim()) {
        if (
          imageUrl.startsWith('http://') ||
          imageUrl.startsWith('https://')
        ) {
          userUpdateData.profileImage = imageUrl;
        } else if (imageUrl.startsWith('/uploads')) {
          const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
          userUpdateData.profileImage = `${baseURL}${imageUrl}`;
        } else {
          userUpdateData.profileImage = imageUrl;
        }
      }

      // Prepare doctor profile data
      const doctorUpdateData: any = {};
      if (doctorProfileData.title) doctorUpdateData.title = doctorProfileData.title;
      if (doctorProfileData.biography) doctorUpdateData.biography = doctorProfileData.biography;
      if (doctorProfileData.memberships && doctorProfileData.memberships.length > 0) {
        doctorUpdateData.memberships = doctorProfileData.memberships.filter((m) => m.name && m.name.trim());
      }
      // Include consultationFees if either value is provided
      const clinicFee = doctorProfileData.consultationFees.clinic;
      const onlineFee = doctorProfileData.consultationFees.online;
      if (clinicFee || onlineFee) {
        doctorUpdateData.consultationFees = {
          clinic: clinicFee && clinicFee !== '' ? parseFloat(clinicFee.toString()) : null,
          online: onlineFee && onlineFee !== '' ? parseFloat(onlineFee.toString()) : null,
        };
      }

      // Update user profile
      if (Object.keys(userUpdateData).length > 0) {
        updateUserProfileMutation.mutate(userUpdateData);
      }

      // Update doctor profile
      if (Object.keys(doctorUpdateData).length > 0) {
        updateDoctorProfileMutation.mutate(doctorUpdateData);
      }
    } else if (activeTab === 'specialties') {
      // Validate specialization
      if (!doctorProfileData.specializationId) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('more.doctorProfileSettings.validation.selectSpecialization'),
        });
        return;
      }

      // Validate services
      const validServices = doctorProfileData.services
        .filter((s) => s.name && s.name.trim() && s.price > 0)
        .map((s) => ({
          name: s.name.trim(),
          price: parseFloat(String(s.price)) || 0,
        }));

      if (validServices.length === 0) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('more.doctorProfileSettings.validation.addAtLeastOneService'),
        });
        return;
      }

      // Prepare update data
      const updateData = {
        specializationId: doctorProfileData.specializationId,
        services: validServices,
      };

      updateDoctorProfileMutation.mutate(updateData);
    } else if (activeTab === 'experience') {
      const validExperiences = doctorProfileData.experience
        .filter((exp) => exp.hospital && exp.hospital.trim())
        .map((exp) => ({
          hospital: exp.hospital.trim(),
          fromYear: exp.fromYear?.trim() || '',
          toYear: exp.toYear?.trim() || '',
          designation: exp.designation?.trim() || '',
        }));
      updateDoctorProfileMutation.mutate({ experience: validExperiences });
    } else if (activeTab === 'education') {
      const validEducations = doctorProfileData.education
        .filter((edu) => edu.degree && edu.degree.trim() && edu.college && edu.college.trim())
        .map((edu) => ({
          degree: edu.degree.trim(),
          college: edu.college.trim(),
          year: edu.year?.trim() || '',
        }));
      updateDoctorProfileMutation.mutate({ education: validEducations });
    } else if (activeTab === 'awards') {
      const validAwards = doctorProfileData.awards
        .filter((award) => award.title && award.title.trim())
        .map((award) => ({
          title: award.title.trim(),
          year: award.year?.trim() || '',
        }));
      updateDoctorProfileMutation.mutate({ awards: validAwards });
    } else if (activeTab === 'clinics') {
      // Filter out empty clinics (only keep those with a name)
      const validClinics = doctorProfileData.clinics
        .filter((clinic) => clinic.name && clinic.name.trim());

      if (validClinics.length === 0) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('more.doctorProfileSettings.validation.addAtLeastOneClinicWithName'),
        });
        return;
      }

      // Prepare update data - only include fields that have values (match web implementation)
      const clinicsData = validClinics.map((clinic) => {
        const clinicData: any = {};

        // Required field
        if (clinic.name?.trim()) {
          clinicData.name = clinic.name.trim();
        }

        // Optional fields - only include if they have values
        if (clinic.address?.trim()) {
          clinicData.address = clinic.address.trim();
        }
        if (clinic.city?.trim()) {
          clinicData.city = clinic.city.trim();
        }
        if (clinic.state?.trim()) {
          clinicData.state = clinic.state.trim();
        }
        if (clinic.country?.trim()) {
          clinicData.country = clinic.country.trim();
        }
        if (clinic.phone?.trim()) {
          clinicData.phone = clinic.phone.trim();
        }
        if (clinic.lat !== null && clinic.lat !== undefined) {
          clinicData.lat = clinic.lat;
        }
        if (clinic.lng !== null && clinic.lng !== undefined) {
          clinicData.lng = clinic.lng;
        }
        if (Array.isArray(clinic.images) && clinic.images.length > 0) {
          clinicData.images = clinic.images;
        }
        if (Array.isArray(clinic.timings) && clinic.timings.length > 0) {
          clinicData.timings = clinic.timings;
        }

        return clinicData;
      });

      updateDoctorProfileMutation.mutate({ clinics: clinicsData });
    } else if (activeTab === 'business') {
      // Convert business hours to clinics timings format
      const timings = Object.keys(businessHours)
        .filter((day) => businessHours[day]?.startTime && businessHours[day]?.endTime)
        .map((day) => ({
          dayOfWeek: day,
          startTime: businessHours[day].startTime,
          endTime: businessHours[day].endTime,
        }));

      // Get existing clinics or create a default one
      const existingClinics = doctorProfileData.clinics;
      let clinics = existingClinics.length > 0 ? [...existingClinics] : [{ name: t('more.doctorProfileSettings.mainClinicDefaultName'), timings: [] }];

      // Update timings for first clinic
      clinics = clinics.map((clinic, index) => {
        if (index === 0) {
          return { ...clinic, timings };
        }
        return clinic;
      });

      updateDoctorProfileMutation.mutate({ clinics });
    } else if (activeTab === 'social') {
      // Prepare update data - only include non-empty URLs, validate URLs
      const socialLinksData: any = {};

      // Validate and add URLs only if they're not empty
      if (socialLinks.facebook?.trim()) {
        if (isValidUrl(socialLinks.facebook.trim())) {
          socialLinksData.facebook = socialLinks.facebook.trim();
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t('more.socialLinks.platforms.facebook') }),
          });
          return;
        }
      }

      if (socialLinks.instagram?.trim()) {
        if (isValidUrl(socialLinks.instagram.trim())) {
          socialLinksData.instagram = socialLinks.instagram.trim();
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t('more.socialLinks.platforms.instagram') }),
          });
          return;
        }
      }

      if (socialLinks.linkedin?.trim()) {
        if (isValidUrl(socialLinks.linkedin.trim())) {
          socialLinksData.linkedin = socialLinks.linkedin.trim();
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t('more.socialLinks.platforms.linkedin') }),
          });
          return;
        }
      }

      if (socialLinks.twitter?.trim()) {
        if (isValidUrl(socialLinks.twitter.trim())) {
          socialLinksData.twitter = socialLinks.twitter.trim();
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t('more.socialLinks.platforms.twitter') }),
          });
          return;
        }
      }

      if (socialLinks.website?.trim()) {
        if (isValidUrl(socialLinks.website.trim())) {
          socialLinksData.website = socialLinks.website.trim();
        } else {
          Toast.show({
            type: 'error',
            text1: t('more.socialLinks.invalidUrlTitle'),
            text2: t('more.socialLinks.invalidUrlBody', { platform: t('more.socialLinks.platforms.website') }),
          });
          return;
        }
      }

      updateDoctorProfileMutation.mutate({ socialLinks: socialLinksData });
    } else if (activeTab === 'insurance') {
      // If convenzionato is enabled but no insurance selected, show warning
      if (convenzionato && selectedInsuranceIds.length === 0) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: t('more.doctorProfileSettings.validation.selectAtLeastOneInsuranceCompany'),
        });
        return;
      }

      const insuranceData: any = {
        convenzionato: convenzionato === true,
        insuranceCompanies: convenzionato ? selectedInsuranceIds : [],
      };
      updateDoctorProfileMutation.mutate(insuranceData);
    }
  };

  const nameParts = userProfileData.fullName ? userProfileData.fullName.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    if (field === 'firstName') {
      setUserProfileData((prev) => ({
        ...prev,
        fullName: `${value} ${lastName}`.trim(),
      }));
    } else if (field === 'lastName') {
      setUserProfileData((prev) => ({
        ...prev,
        fullName: `${firstName} ${value}`.trim(),
      }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['userProfile', userId] }),
      refetchDoctorProfile(),
    ]);
    setRefreshing(false);
  };

  const normalizeImageUrl = (imageUri: string | undefined): string => {
    if (!imageUri) return '';
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const deviceHost =
        API_BASE_URL?.replace('/api', '').replace('http://', '').replace('https://', '') || 'localhost:5000';
      return imageUri.replace(/localhost|127\.0\.0\.1/, deviceHost.split(':')[0]);
    }
    const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseURL}${imageUri}`;
  };

  if (userProfileLoading || doctorProfileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.doctorProfileSettings.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayImageUrl = normalizeImageUrl(profileImagePreview || userProfileData.profileImage);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const renderBasicTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Profile Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.profileImage')}</Text>
        <View style={styles.profilePhotoContainer}>
          <View style={styles.profilePhoto}>
            {displayImageUrl ? (
              <Image source={{ uri: displayImageUrl }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            )}
          </View>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleImagePicker}
              disabled={updateUserProfileMutation.isPending || updateDoctorProfileMutation.isPending}
            >
              <Text style={styles.photoButtonText}>{t('more.profileSettings.selectImage')}</Text>
            </TouchableOpacity>
            {displayImageUrl && (
              <TouchableOpacity style={styles.photoButtonRemove} onPress={handleRemoveImage}>
                <Text style={styles.photoButtonRemoveText}>{t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.photoHint}>{t('more.settings.photoHint')}</Text>
      </View>

      {/* Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.settings.information')}</Text>
        <Input
          label={t('more.settings.firstNameLabel')}
          value={firstName}
          onChangeText={(text) => handleNameChange('firstName', text)}
          placeholder={t('more.settings.firstNamePlaceholder')}
        />
        <Input
          label={t('more.settings.lastNameLabel')}
          value={lastName}
          onChangeText={(text) => handleNameChange('lastName', text)}
          placeholder={t('more.settings.lastNamePlaceholder')}
        />
        <Input
          label={t('more.doctorProfileSettings.displayNameLabel')}
          value={userProfileData.fullName}
          onChangeText={(text) => setUserProfileData((prev) => ({ ...prev, fullName: text }))}
          placeholder={t('more.doctorProfileSettings.displayNamePlaceholder')}
        />
        <Input
          label={t('more.doctorProfileSettings.designationLabel')}
          value={doctorProfileData.title}
          onChangeText={(text) => setDoctorProfileData((prev) => ({ ...prev, title: text }))}
          placeholder={t('more.doctorProfileSettings.designationPlaceholder')}
        />
        <Input
          label={t('more.settings.phoneNumberLabel')}
          value={userProfileData.phone}
          onChangeText={(text) => setUserProfileData((prev) => ({ ...prev, phone: text }))}
          placeholder={t('more.settings.phoneNumberPlaceholder')}
          keyboardType="phone-pad"
        />
        <Input
          label={t('more.settings.emailAddressLabel')}
          value={(user as any)?.email || ''}
          editable={false}
          style={styles.disabledInput}
          placeholder={t('more.doctorProfileSettings.emailCannotBeChanged')}
        />
      </View>

      {/* Biography */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.biography')}</Text>
        <Input
          label={t('more.doctorProfileSettings.biographyLabel')}
          value={doctorProfileData.biography}
          onChangeText={(text) => setDoctorProfileData((prev) => ({ ...prev, biography: text }))}
          placeholder={t('more.doctorProfileSettings.biographyPlaceholder')}
          multiline
          numberOfLines={5}
          style={styles.textArea}
        />
        <Text style={styles.hintText}>{t('more.doctorProfileSettings.biographyHint')}</Text>
      </View>

      {/* Consultation Fees */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.consultationFees')}</Text>
        <View style={styles.feesRow}>
          <View style={styles.feeInput}>
            <Input
              label={t('more.doctorProfileSettings.inPersonVisitFeeLabel')}
              value={typeof doctorProfileData.consultationFees.clinic === 'number' 
                ? doctorProfileData.consultationFees.clinic.toString() 
                : (doctorProfileData.consultationFees.clinic || '')}
              onChangeText={(text) => handleConsultationFeeChange('clinic', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.hintText}>{t('more.doctorProfileSettings.inPersonVisitFeeHint')}</Text>
          </View>
          <View style={styles.feeInput}>
            <Input
              label={t('more.doctorProfileSettings.onlineConsultationFeeLabel')}
              value={typeof doctorProfileData.consultationFees.online === 'number' 
                ? doctorProfileData.consultationFees.online.toString() 
                : (doctorProfileData.consultationFees.online || '')}
              onChangeText={(text) => handleConsultationFeeChange('online', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.hintText}>{t('more.doctorProfileSettings.onlineConsultationFeeHint')}</Text>
          </View>
        </View>
      </View>

      {/* Memberships */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.memberships')}</Text>
        {doctorProfileData.memberships.length > 0 ? (
          <View style={styles.membershipsList}>
            {doctorProfileData.memberships.map((membership, index) => (
              <View key={index} style={styles.membershipItem}>
                <Input
                  label={t('more.doctorProfileSettings.membershipNameLabel')}
                  value={membership.name}
                  onChangeText={(text) => handleMembershipChange(index, text)}
                  placeholder={t('more.doctorProfileSettings.membershipNamePlaceholder')}
                  style={styles.membershipInput}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMembership(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.memberships')}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddMembership}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addNew')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const handleSpecializationChange = (specializationId: string) => {
    setDoctorProfileData((prev) => ({ ...prev, specializationId }));
  };

  const handleServiceChange = (index: number, field: 'name' | 'price', value: string | number) => {
    setDoctorProfileData((prev) => {
      const newServices = [...prev.services];
      if (!newServices[index]) {
        newServices[index] = { name: '', price: 0 };
      }
      newServices[index] = {
        ...newServices[index],
        [field]: field === 'price' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value,
      };
      return { ...prev, services: newServices };
    });
  };

  const handleAddService = () => {
    setDoctorProfileData((prev) => ({
      ...prev,
      services: [...prev.services, { name: '', price: 0 }],
    }));
  };

  const handleRemoveService = (index: number) => {
    Alert.alert(t('more.doctorProfileSettings.alerts.removeService.title'), t('more.doctorProfileSettings.alerts.removeService.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setDoctorProfileData((prev) => ({
            ...prev,
            services: prev.services.filter((_, i) => i !== index),
          }));
        },
      },
    ]);
  };

  const renderSpecialtiesTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.specialization')}</Text>
        <Text style={styles.sectionSubtitle}>{t('more.doctorProfileSettings.specializationSubtitle')}</Text>
        
        {specializationsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.selectContainer}>
            {specializations.map((spec: specializationApi.Specialization) => (
              <TouchableOpacity
                key={spec._id}
                style={[
                  styles.selectOption,
                  doctorProfileData.specializationId === spec._id && styles.selectOptionActive,
                ]}
                onPress={() => handleSpecializationChange(spec._id)}
              >
                <View style={styles.selectOptionContent}>
                  <Ionicons
                    name={doctorProfileData.specializationId === spec._id ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={doctorProfileData.specializationId === spec._id ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.selectOptionText}>
                    <Text style={styles.selectOptionLabel}>{spec.name}</Text>
                    {spec.description && (
                      <Text style={styles.selectOptionDescription}>{spec.description}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.services')}</Text>
        <Text style={styles.sectionSubtitle}>{t('more.doctorProfileSettings.servicesSubtitle')}</Text>
        
        {doctorProfileData.services.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.services.map((service, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label={t('more.doctorProfileSettings.serviceNameLabel')}
                  value={service.name}
                  onChangeText={(text) => handleServiceChange(index, 'name', text)}
                  placeholder={t('more.doctorProfileSettings.serviceNamePlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.servicePriceLabel')}
                  value={String(service.price || '')}
                  onChangeText={(text) => handleServiceChange(index, 'price', text)}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveService(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.services')}</Text>
        )}
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addService')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderExperienceTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.professionalExperience')}</Text>
        {doctorProfileData.experience.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.experience.map((exp, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label={t('more.doctorProfileSettings.hospitalInstitutionLabel')}
                  value={exp.hospital}
                  onChangeText={(text) => handleExperienceChange(index, 'hospital', text)}
                  placeholder={t('more.doctorProfileSettings.hospitalInstitutionPlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.designationOptionalLabel')}
                  value={exp.designation}
                  onChangeText={(text) => handleExperienceChange(index, 'designation', text)}
                  placeholder={t('more.doctorProfileSettings.designationOptionalPlaceholder')}
                />
                <View style={styles.row}>
                  <Input
                    label={t('more.doctorProfileSettings.fromYearLabel')}
                    value={exp.fromYear}
                    onChangeText={(text) => handleExperienceChange(index, 'fromYear', text)}
                    placeholder={t('more.doctorProfileSettings.yearPlaceholder')}
                    keyboardType="numeric"
                    style={styles.halfInput}
                  />
                  <Input
                    label={t('more.doctorProfileSettings.toYearLabel')}
                    value={exp.toYear}
                    onChangeText={(text) => handleExperienceChange(index, 'toYear', text)}
                    placeholder={t('more.doctorProfileSettings.yearPlaceholder')}
                    keyboardType="numeric"
                    style={styles.halfInput}
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveExperience(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.experience')}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddExperience}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addExperience')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderEducationTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.education')}</Text>
        {doctorProfileData.education.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.education.map((edu, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label={t('more.doctorProfileSettings.degreeLabel')}
                  value={edu.degree}
                  onChangeText={(text) => handleEducationChange(index, 'degree', text)}
                  placeholder={t('more.doctorProfileSettings.degreePlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.collegeUniversityLabel')}
                  value={edu.college}
                  onChangeText={(text) => handleEducationChange(index, 'college', text)}
                  placeholder={t('more.doctorProfileSettings.collegeUniversityPlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.yearLabel')}
                  value={edu.year}
                  onChangeText={(text) => handleEducationChange(index, 'year', text)}
                  placeholder={t('more.doctorProfileSettings.yearPlaceholder')}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveEducation(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.education')}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddEducation}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addEducation')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAwardsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.awardsRecognition')}</Text>
        {doctorProfileData.awards.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.awards.map((award, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label={t('more.doctorProfileSettings.awardTitleLabel')}
                  value={award.title}
                  onChangeText={(text) => handleAwardChange(index, 'title', text)}
                  placeholder={t('more.doctorProfileSettings.awardTitlePlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.yearLabel')}
                  value={award.year}
                  onChangeText={(text) => handleAwardChange(index, 'year', text)}
                  placeholder={t('more.doctorProfileSettings.yearPlaceholder')}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveAward(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.awards')}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddAward}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addAward')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderClinicsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.clinics')}</Text>
        {doctorProfileData.clinics.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.clinics.map((clinic, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label={t('more.doctorProfileSettings.clinicNameLabel')}
                  value={clinic.name}
                  onChangeText={(text) => handleClinicChange(index, 'name', text)}
                  placeholder={t('more.doctorProfileSettings.clinicNamePlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.addressLabel')}
                  value={clinic.address}
                  onChangeText={(text) => handleClinicChange(index, 'address', text)}
                  placeholder={t('more.doctorProfileSettings.addressPlaceholder')}
                />
                <View style={styles.row}>
                  <Input
                    label={t('more.doctorProfileSettings.cityLabel')}
                    value={clinic.city}
                    onChangeText={(text) => handleClinicChange(index, 'city', text)}
                    placeholder={t('more.doctorProfileSettings.cityPlaceholder')}
                    style={styles.halfInput}
                  />
                  <Input
                    label={t('more.doctorProfileSettings.stateLabel')}
                    value={clinic.state}
                    onChangeText={(text) => handleClinicChange(index, 'state', text)}
                    placeholder={t('more.doctorProfileSettings.statePlaceholder')}
                    style={styles.halfInput}
                  />
                </View>
                <Input
                  label={t('more.doctorProfileSettings.countryLabel')}
                  value={clinic.country}
                  onChangeText={(text) => handleClinicChange(index, 'country', text)}
                  placeholder={t('more.doctorProfileSettings.countryPlaceholder')}
                />
                <Input
                  label={t('more.doctorProfileSettings.phoneLabel')}
                  value={clinic.phone}
                  onChangeText={(text) => handleClinicChange(index, 'phone', text)}
                  placeholder={t('more.doctorProfileSettings.phonePlaceholder')}
                  keyboardType="phone-pad"
                />
                <View style={styles.coordinatesSection}>
                  <Text style={styles.coordinatesSectionTitle}>{t('more.doctorProfileSettings.locationCoordinatesTitle')}</Text>
                  <Text style={styles.coordinatesHint}>{t('more.doctorProfileSettings.locationCoordinatesHint')}</Text>
                  <View style={styles.row}>
                    <Input
                      label={t('more.doctorProfileSettings.latitudeLabel')}
                      value={clinic.lat !== null && clinic.lat !== undefined ? clinic.lat.toString() : ''}
                      onChangeText={(text) => {
                        const numValue = text.trim() === '' ? null : parseFloat(text);
                        if (text.trim() === '' || (!isNaN(numValue!) && numValue! >= -90 && numValue! <= 90)) {
                          handleClinicChange(index, 'lat', numValue);
                        }
                      }}
                      placeholder={t('more.doctorProfileSettings.latitudePlaceholder')}
                      keyboardType="decimal-pad"
                      style={styles.halfInput}
                    />
                    <Input
                      label={t('more.doctorProfileSettings.longitudeLabel')}
                      value={clinic.lng !== null && clinic.lng !== undefined ? clinic.lng.toString() : ''}
                      onChangeText={(text) => {
                        const numValue = text.trim() === '' ? null : parseFloat(text);
                        if (text.trim() === '' || (!isNaN(numValue!) && numValue! >= -180 && numValue! <= 180)) {
                          handleClinicChange(index, 'lng', numValue);
                        }
                      }}
                      placeholder={t('more.doctorProfileSettings.longitudePlaceholder')}
                      keyboardType="decimal-pad"
                      style={styles.halfInput}
                    />
                  </View>
                  <Text style={styles.coordinatesInfo}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />{' '}
                    {t('more.doctorProfileSettings.coordinatesInfo')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveClinic(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>{t('common.remove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('more.doctorProfileSettings.empty.clinics')}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddClinic}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>{t('more.doctorProfileSettings.actions.addClinic')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBusinessTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.businessHours')}</Text>
        {days.map((day) => (
          <View key={day} style={styles.businessHoursItem}>
            <Text style={styles.dayLabel}>{t(`more.doctorProfileSettings.weekdays.${day.toLowerCase()}`)}</Text>
            <View style={styles.timeRow}>
              <Input
                label={t('more.doctorProfileSettings.startTimeLabel')}
                value={businessHours[day]?.startTime || ''}
                onChangeText={(text) => handleTimeChange(day, 'startTime', text)}
                placeholder={t('more.doctorProfileSettings.timePlaceholder')}
                style={styles.halfInput}
              />
              <Input
                label={t('more.doctorProfileSettings.endTimeLabel')}
                value={businessHours[day]?.endTime || ''}
                onChangeText={(text) => handleTimeChange(day, 'endTime', text)}
                placeholder={t('more.doctorProfileSettings.timePlaceholder')}
                style={styles.halfInput}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderSocialTab = () => {
    const socialPlatforms = [
      { key: 'facebook' as keyof typeof socialLinks, label: t('more.socialLinks.platforms.facebook'), icon: 'logo-facebook' },
      { key: 'instagram' as keyof typeof socialLinks, label: t('more.socialLinks.platforms.instagram'), icon: 'logo-instagram' },
      { key: 'linkedin' as keyof typeof socialLinks, label: t('more.socialLinks.platforms.linkedin'), icon: 'logo-linkedin' },
      { key: 'twitter' as keyof typeof socialLinks, label: t('more.socialLinks.platforms.twitter'), icon: 'logo-twitter' },
      { key: 'website' as keyof typeof socialLinks, label: t('more.socialLinks.platforms.website'), icon: 'globe-outline' },
    ];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.socialLinks')}</Text>
          <Text style={styles.sectionSubtitle}>{t('more.socialLinks.subtitle')}</Text>

          {socialPlatforms.map((platform) => (
            <View key={platform.key} style={styles.linkContainer}>
              <View style={styles.linkHeader}>
                <Ionicons name={platform.icon as any} size={24} color={colors.primary} />
                <Text style={styles.linkLabel}>{platform.label}</Text>
              </View>
              <Input
                placeholder={t('more.socialLinks.addUrlPlaceholder', { platform: platform.label })}
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
      </ScrollView>
    );
  };

  // Handle insurance toggle
  const handleConvenzionatoToggle = (value: boolean) => {
    setConvenzionato(value);
    if (!value) {
      setSelectedInsuranceIds([]);
    }
  };

  // Handle insurance company selection
  const handleInsuranceToggle = (insuranceId: string) => {
    setSelectedInsuranceIds((prev) => {
      if (prev.includes(insuranceId)) {
        return prev.filter((id) => id !== insuranceId);
      } else {
        return [...prev, insuranceId];
      }
    });
  };

  const renderInsuranceTab = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('more.doctorProfileSettings.sections.insuranceSettings')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('more.doctorProfileSettings.insuranceSettingsSubtitle')}
          </Text>

          {/* Convenzionato Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('more.doctorProfileSettings.acceptInsuranceLabel')}</Text>
              <TouchableOpacity
                style={[styles.toggleSwitch, convenzionato && styles.toggleSwitchActive]}
                onPress={() => handleConvenzionatoToggle(!convenzionato)}
                disabled={updateDoctorProfileMutation.isPending}
              >
                <View style={[styles.toggleThumb, convenzionato && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.toggleHint}>
              {convenzionato
                ? t('more.doctorProfileSettings.acceptInsuranceYes')
                : t('more.doctorProfileSettings.acceptInsuranceNo')}
            </Text>
          </View>

          {/* Insurance Companies Selection */}
          {convenzionato && (
            <View style={styles.insuranceSection}>
              <Text style={styles.sectionSubtitle}>{t('more.doctorProfileSettings.selectInsuranceCompaniesLabel')}</Text>
              {insuranceLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>{t('more.doctorProfileSettings.loadingInsuranceCompanies')}</Text>
                </View>
              ) : insuranceCompanies.length === 0 ? (
                <View style={styles.warningCard}>
                  <Ionicons name="warning-outline" size={24} color={colors.warning} />
                  <Text style={styles.warningText}>
                    {t('more.doctorProfileSettings.noActiveInsuranceCompanies')}
                  </Text>
                </View>
              ) : (
                <View style={styles.insuranceGrid}>
                  {insuranceCompanies.map((insurance) => {
                    const insuranceId = insurance._id || insurance.id || '';
                    const isSelected = selectedInsuranceIds.includes(insuranceId);
                    const logoUrl = insurance.logo ? normalizeImageUrl(insurance.logo) : '';

                    return (
                      <TouchableOpacity
                        key={insuranceId}
                        style={[
                          styles.insuranceCard,
                          isSelected && styles.insuranceCardSelected,
                        ]}
                        onPress={() => handleInsuranceToggle(insuranceId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.insuranceCardContent}>
                          {logoUrl ? (
                            <Image
                              source={{ uri: logoUrl }}
                              style={styles.insuranceLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.insurancePlaceholder}>
                              <Ionicons name="shield" size={32} color={colors.textSecondary} />
                            </View>
                          )}
                          <Text style={styles.insuranceName} numberOfLines={2}>
                            {insurance.name}
                          </Text>
                          <View style={styles.insuranceCheck}>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            ) : (
                              <Ionicons name="ellipse-outline" size={24} color={colors.textSecondary} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {convenzionato && selectedInsuranceIds.length === 0 && insuranceCompanies.length > 0 && (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.info} />
                  <Text style={styles.infoText}>{t('more.doctorProfileSettings.validation.selectAtLeastOneInsuranceCompany')}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicTab();
      case 'specialties':
        return renderSpecialtiesTab();
      case 'experience':
        return renderExperienceTab();
      case 'education':
        return renderEducationTab();
      case 'awards':
        return renderAwardsTab();
      case 'clinics':
        return renderClinicsTab();
      case 'insurance':
        return renderInsuranceTab();
      case 'business':
        return renderBusinessTab();
      case 'social':
        return renderSocialTab();
      default:
        return renderBasicTab();
    }
  };

  const tabs = [
    { key: 'basic' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.basic'), icon: 'person' },
    { key: 'specialties' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.specialties'), icon: 'medical' },
    { key: 'experience' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.experience'), icon: 'briefcase' },
    { key: 'education' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.education'), icon: 'school' },
    { key: 'awards' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.awards'), icon: 'trophy' },
    { key: 'clinics' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.clinics'), icon: 'business' },
    { key: 'insurance' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.insurance'), icon: 'shield' },
    { key: 'business' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.business'), icon: 'time' },
    { key: 'social' as TabTypeLocal, label: t('more.doctorProfileSettings.tabs.social'), icon: 'share-social' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <Button
          title={
            updateUserProfileMutation.isPending || updateDoctorProfileMutation.isPending
              ? t('common.saving')
              : t('common.saveChanges')
          }
          onPress={handleSubmit}
          disabled={updateUserProfileMutation.isPending || updateDoctorProfileMutation.isPending}
          style={styles.saveButton}
        />
      </View>
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
  tabsContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    maxHeight: 50,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 4,
    height: 40,
  },
  activeTab: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  profilePhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    flex: 1,
  },
  photoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  photoButtonRemove: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoButtonRemoveText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  photoHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  disabledInput: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.6,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  feesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feeInput: {
    flex: 1,
  },
  membershipsList: {
    marginBottom: 12,
  },
  membershipItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  membershipInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 8,
  },
  listContainer: {
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  removeItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  removeItemButtonText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: 8,
  },
  businessHoursItem: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsSection: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    marginBottom: 16,
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
  coordinatesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  coordinatesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  coordinatesHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  coordinatesInfo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectContainer: {
    marginTop: 12,
  },
  selectScroll: {
    maxHeight: 300,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  selectOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectOptionText: {
    flex: 1,
  },
  selectOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  selectOptionTextActive: {
    color: colors.primary,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  toggleContainer: {
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  insuranceSection: {
    marginTop: 24,
  },
  insuranceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  insuranceCard: {
    width: '48%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
  },
  insuranceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  insuranceCardContent: {
    alignItems: 'center',
    width: '100%',
  },
  insuranceLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  insurancePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insuranceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  insuranceCheck: {
    marginTop: 4,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight || colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: 12,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
