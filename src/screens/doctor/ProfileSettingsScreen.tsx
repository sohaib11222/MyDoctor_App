import React, { useState, useEffect, useRef } from 'react';
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

type TabType = 'basic' | 'experience' | 'education' | 'awards' | 'clinics' | 'business' | 'social';

export const ProfileSettingsScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
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
    memberships: [] as Array<{ name: string }>,
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

  // Profile image preview
  const [profileImagePreview, setProfileImagePreview] = useState('');

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
        throw new Error('User not authenticated');
      }
      return profileApi.getDoctorProfile();
    },
    enabled: !!user && !!userId,
    retry: 1,
  });

  // Update user profile mutation
  const updateUserProfileMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update profile';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Update doctor profile mutation
  const updateDoctorProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure user is available before making the call
      if (!user || !userId) {
        throw new Error('User not authenticated');
      }
      return profileApi.updateDoctorProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?._id] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Doctor profile updated successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update doctor profile';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Upload profile image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: any) => {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || 'profile.jpg',
      } as any);
      return uploadApi.uploadProfileImage(formData);
    },
    onSuccess: (response) => {
      const relativeUrl = response.data?.url || response.url;
      const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      const imageUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseURL}${relativeUrl}`;
      setUserProfileData((prev) => ({ ...prev, profileImage: imageUrl }));
      setProfileImagePreview(relativeUrl);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Image uploaded successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload image';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

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
      setDoctorProfileData({
        title: profile.title || '',
        biography: profile.biography || '',
        memberships: profile.memberships || [],
        experience: profile.experience || [],
        education: profile.education || [],
        awards: profile.awards || [],
        clinics: profile.clinics || [],
      });

      // Initialize business hours from first clinic
      if (profile.clinics && profile.clinics.length > 0 && profile.clinics[0].timings) {
        const hours: Record<string, { startTime: string; endTime: string }> = {};
        profile.clinics[0].timings.forEach((timing) => {
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
    }
  }, [doctorProfile]);

  // Handle image selection
  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant permission to access your photos.');
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
          text1: 'Error',
          text2: 'Image size must be less than 4 MB',
        });
        return;
      }
      uploadImageMutation.mutate(asset);
    }
  };

  const handleRemoveImage = () => {
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
    Alert.alert('Remove Experience', 'Are you sure you want to remove this experience?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
    Alert.alert('Remove Education', 'Are you sure you want to remove this education?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
    Alert.alert('Remove Award', 'Are you sure you want to remove this award?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
    Alert.alert('Remove Clinic', 'Are you sure you want to remove this clinic?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
  const handleSubmit = () => {
    if (activeTab === 'basic') {
      // Validate required fields
      if (!userProfileData.fullName || !userProfileData.phone) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please fill in all required fields (Full Name, Phone)',
        });
        return;
      }

      // Prepare user profile data
      const userUpdateData: any = {};
      if (userProfileData.fullName) userUpdateData.fullName = userProfileData.fullName;
      if (userProfileData.phone) userUpdateData.phone = userProfileData.phone;
      if (userProfileData.profileImage && userProfileData.profileImage.trim()) {
        if (
          userProfileData.profileImage.startsWith('http://') ||
          userProfileData.profileImage.startsWith('https://')
        ) {
          userUpdateData.profileImage = userProfileData.profileImage;
        } else if (userProfileData.profileImage.startsWith('/uploads')) {
          const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
          userUpdateData.profileImage = `${baseURL}${userProfileData.profileImage}`;
        }
      }

      // Prepare doctor profile data
      const doctorUpdateData: any = {};
      if (doctorProfileData.title) doctorUpdateData.title = doctorProfileData.title;
      if (doctorProfileData.biography) doctorUpdateData.biography = doctorProfileData.biography;
      if (doctorProfileData.memberships && doctorProfileData.memberships.length > 0) {
        doctorUpdateData.memberships = doctorProfileData.memberships.filter((m) => m.name && m.name.trim());
      }

      // Update user profile
      if (Object.keys(userUpdateData).length > 0) {
        updateUserProfileMutation.mutate(userUpdateData);
      }

      // Update doctor profile
      if (Object.keys(doctorUpdateData).length > 0) {
        updateDoctorProfileMutation.mutate(doctorUpdateData);
      }
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
          text1: 'Error',
          text2: 'Please add at least one clinic with a name',
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
      let clinics = existingClinics.length > 0 ? [...existingClinics] : [{ name: 'Main Clinic', timings: [] }];

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
            text1: 'Invalid URL',
            text2: 'Please enter a valid Facebook URL',
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
            text1: 'Invalid URL',
            text2: 'Please enter a valid Instagram URL',
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
            text1: 'Invalid URL',
            text2: 'Please enter a valid LinkedIn URL',
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
            text1: 'Invalid URL',
            text2: 'Please enter a valid Twitter URL',
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
            text1: 'Invalid URL',
            text2: 'Please enter a valid Website URL',
          });
          return;
        }
      }

      updateDoctorProfileMutation.mutate({ socialLinks: socialLinksData });
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
          <Text style={styles.loadingText}>Loading profile...</Text>
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
        <Text style={styles.sectionTitle}>Profile Image</Text>
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
              disabled={uploadImageMutation.isPending}
            >
              {uploadImageMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <Text style={styles.photoButtonText}>Upload New</Text>
              )}
            </TouchableOpacity>
            {displayImageUrl && (
              <TouchableOpacity style={styles.photoButtonRemove} onPress={handleRemoveImage}>
                <Text style={styles.photoButtonRemoveText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.photoHint}>Your Image should Below 4 MB, Accepted format jpg,png,svg</Text>
      </View>

      {/* Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        <Input
          label="First Name *"
          value={firstName}
          onChangeText={(text) => handleNameChange('firstName', text)}
          placeholder="Enter first name"
        />
        <Input
          label="Last Name *"
          value={lastName}
          onChangeText={(text) => handleNameChange('lastName', text)}
          placeholder="Enter last name"
        />
        <Input
          label="Display Name *"
          value={userProfileData.fullName}
          onChangeText={(text) => setUserProfileData((prev) => ({ ...prev, fullName: text }))}
          placeholder="Enter display name"
        />
        <Input
          label="Designation *"
          value={doctorProfileData.title}
          onChangeText={(text) => setDoctorProfileData((prev) => ({ ...prev, title: text }))}
          placeholder="e.g., MD, MBBS, etc."
        />
        <Input
          label="Phone Numbers *"
          value={userProfileData.phone}
          onChangeText={(text) => setUserProfileData((prev) => ({ ...prev, phone: text }))}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
        <Input
          label="Email Address *"
          value={(user as any)?.email || ''}
          editable={false}
          style={styles.disabledInput}
          placeholder="Email cannot be changed"
        />
      </View>

      {/* Biography */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biography</Text>
        <Input
          label="Biography *"
          value={doctorProfileData.biography}
          onChangeText={(text) => setDoctorProfileData((prev) => ({ ...prev, biography: text }))}
          placeholder="Enter your biography, professional background, and expertise..."
          multiline
          numberOfLines={5}
          style={styles.textArea}
        />
        <Text style={styles.hintText}>This information will be displayed on your profile page</Text>
      </View>

      {/* Memberships */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memberships</Text>
        {doctorProfileData.memberships.length > 0 ? (
          <View style={styles.membershipsList}>
            {doctorProfileData.memberships.map((membership, index) => (
              <View key={index} style={styles.membershipItem}>
                <Input
                  label="Membership Name"
                  value={membership.name}
                  onChangeText={(text) => handleMembershipChange(index, text)}
                  placeholder="Enter membership name"
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
          <Text style={styles.emptyText}>No memberships added yet</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddMembership}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderExperienceTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Experience</Text>
        {doctorProfileData.experience.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.experience.map((exp, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label="Hospital/Institution *"
                  value={exp.hospital}
                  onChangeText={(text) => handleExperienceChange(index, 'hospital', text)}
                  placeholder="Enter hospital name"
                />
                <Input
                  label="Designation"
                  value={exp.designation}
                  onChangeText={(text) => handleExperienceChange(index, 'designation', text)}
                  placeholder="Enter designation"
                />
                <View style={styles.row}>
                  <Input
                    label="From Year"
                    value={exp.fromYear}
                    onChangeText={(text) => handleExperienceChange(index, 'fromYear', text)}
                    placeholder="YYYY"
                    keyboardType="numeric"
                    style={styles.halfInput}
                  />
                  <Input
                    label="To Year"
                    value={exp.toYear}
                    onChangeText={(text) => handleExperienceChange(index, 'toYear', text)}
                    placeholder="YYYY"
                    keyboardType="numeric"
                    style={styles.halfInput}
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveExperience(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No experience added yet</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddExperience}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Experience</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderEducationTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education</Text>
        {doctorProfileData.education.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.education.map((edu, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label="Degree *"
                  value={edu.degree}
                  onChangeText={(text) => handleEducationChange(index, 'degree', text)}
                  placeholder="Enter degree"
                />
                <Input
                  label="College/University *"
                  value={edu.college}
                  onChangeText={(text) => handleEducationChange(index, 'college', text)}
                  placeholder="Enter college name"
                />
                <Input
                  label="Year"
                  value={edu.year}
                  onChangeText={(text) => handleEducationChange(index, 'year', text)}
                  placeholder="YYYY"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveEducation(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No education added yet</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddEducation}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Education</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAwardsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Awards & Recognition</Text>
        {doctorProfileData.awards.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.awards.map((award, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label="Award Title *"
                  value={award.title}
                  onChangeText={(text) => handleAwardChange(index, 'title', text)}
                  placeholder="Enter award title"
                />
                <Input
                  label="Year"
                  value={award.year}
                  onChangeText={(text) => handleAwardChange(index, 'year', text)}
                  placeholder="YYYY"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveAward(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No awards added yet</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddAward}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Award</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderClinicsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinics</Text>
        {doctorProfileData.clinics.length > 0 ? (
          <View style={styles.listContainer}>
            {doctorProfileData.clinics.map((clinic, index) => (
              <View key={index} style={styles.itemCard}>
                <Input
                  label="Clinic Name *"
                  value={clinic.name}
                  onChangeText={(text) => handleClinicChange(index, 'name', text)}
                  placeholder="Enter clinic name"
                />
                <Input
                  label="Address"
                  value={clinic.address}
                  onChangeText={(text) => handleClinicChange(index, 'address', text)}
                  placeholder="Enter address"
                />
                <View style={styles.row}>
                  <Input
                    label="City"
                    value={clinic.city}
                    onChangeText={(text) => handleClinicChange(index, 'city', text)}
                    placeholder="Enter city"
                    style={styles.halfInput}
                  />
                  <Input
                    label="State"
                    value={clinic.state}
                    onChangeText={(text) => handleClinicChange(index, 'state', text)}
                    placeholder="Enter state"
                    style={styles.halfInput}
                  />
                </View>
                <Input
                  label="Country"
                  value={clinic.country}
                  onChangeText={(text) => handleClinicChange(index, 'country', text)}
                  placeholder="Enter country"
                />
                <Input
                  label="Phone"
                  value={clinic.phone}
                  onChangeText={(text) => handleClinicChange(index, 'phone', text)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
                <View style={styles.coordinatesSection}>
                  <Text style={styles.coordinatesSectionTitle}>Location Coordinates</Text>
                  <Text style={styles.coordinatesHint}>
                    Enter latitude and longitude for map integration (optional)
                  </Text>
                  <View style={styles.row}>
                    <Input
                      label="Latitude"
                      value={clinic.lat !== null && clinic.lat !== undefined ? clinic.lat.toString() : ''}
                      onChangeText={(text) => {
                        const numValue = text.trim() === '' ? null : parseFloat(text);
                        if (text.trim() === '' || (!isNaN(numValue!) && numValue! >= -90 && numValue! <= 90)) {
                          handleClinicChange(index, 'lat', numValue);
                        }
                      }}
                      placeholder="e.g., 40.7128"
                      keyboardType="decimal-pad"
                      style={styles.halfInput}
                    />
                    <Input
                      label="Longitude"
                      value={clinic.lng !== null && clinic.lng !== undefined ? clinic.lng.toString() : ''}
                      onChangeText={(text) => {
                        const numValue = text.trim() === '' ? null : parseFloat(text);
                        if (text.trim() === '' || (!isNaN(numValue!) && numValue! >= -180 && numValue! <= 180)) {
                          handleClinicChange(index, 'lng', numValue);
                        }
                      }}
                      placeholder="e.g., -74.0060"
                      keyboardType="decimal-pad"
                      style={styles.halfInput}
                    />
                  </View>
                  <Text style={styles.coordinatesInfo}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />{' '}
                    Latitude: -90 to 90, Longitude: -180 to 180
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => handleRemoveClinic(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.removeItemButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No clinics added yet</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddClinic}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Clinic</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBusinessTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Hours</Text>
        {days.map((day) => (
          <View key={day} style={styles.businessHoursItem}>
            <Text style={styles.dayLabel}>{day}</Text>
            <View style={styles.timeRow}>
              <Input
                label="Start Time"
                value={businessHours[day]?.startTime || ''}
                onChangeText={(text) => handleTimeChange(day, 'startTime', text)}
                placeholder="HH:MM"
                style={styles.halfInput}
              />
              <Input
                label="End Time"
                value={businessHours[day]?.endTime || ''}
                onChangeText={(text) => handleTimeChange(day, 'endTime', text)}
                placeholder="HH:MM"
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
      { key: 'facebook' as keyof typeof socialLinks, label: 'Facebook', icon: 'logo-facebook' },
      { key: 'instagram' as keyof typeof socialLinks, label: 'Instagram', icon: 'logo-instagram' },
      { key: 'linkedin' as keyof typeof socialLinks, label: 'LinkedIn', icon: 'logo-linkedin' },
      { key: 'twitter' as keyof typeof socialLinks, label: 'Twitter', icon: 'logo-twitter' },
      { key: 'website' as keyof typeof socialLinks, label: 'Website', icon: 'globe-outline' },
    ];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          <Text style={styles.sectionSubtitle}>Add your social media profiles to connect with patients</Text>

          {socialPlatforms.map((platform) => (
            <View key={platform.key} style={styles.linkContainer}>
              <View style={styles.linkHeader}>
                <Ionicons name={platform.icon as any} size={24} color={colors.primary} />
                <Text style={styles.linkLabel}>{platform.label}</Text>
              </View>
              <Input
                placeholder={`Add ${platform.label} URL`}
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
            <Text style={styles.infoTitle}>About Social Links</Text>
            <Text style={styles.infoText}>
              Add your social media profiles and website URL. These links will be displayed on your public profile
              page. Make sure to enter valid URLs starting with http:// or https://
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicTab();
      case 'experience':
        return renderExperienceTab();
      case 'education':
        return renderEducationTab();
      case 'awards':
        return renderAwardsTab();
      case 'clinics':
        return renderClinicsTab();
      case 'business':
        return renderBusinessTab();
      case 'social':
        return renderSocialTab();
      default:
        return renderBasicTab();
    }
  };

  const tabs = [
    { key: 'basic' as TabType, label: 'Basic', icon: 'person' },
    { key: 'experience' as TabType, label: 'Experience', icon: 'briefcase' },
    { key: 'education' as TabType, label: 'Education', icon: 'school' },
    { key: 'awards' as TabType, label: 'Awards', icon: 'trophy' },
    { key: 'clinics' as TabType, label: 'Clinics', icon: 'business' },
    { key: 'business' as TabType, label: 'Business Hours', icon: 'time' },
    { key: 'social' as TabType, label: 'Social Links', icon: 'share-social' },
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
              ? 'Saving...'
              : 'Save Changes'
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
});
