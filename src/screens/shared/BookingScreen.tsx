import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as doctorApi from '../../services/doctor';
import * as scheduleApi from '../../services/schedule';
import * as appointmentApi from '../../services/appointment';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

const defaultAvatar = require('../../../assets/avatar.png');

/**
 * Normalize image URL for mobile app
 */
const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.1.11';
  }
  
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

type BookingScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'Booking'>;
type BookingRouteProp = RouteProp<AppointmentsStackParamList, 'Booking'>;

const BookingScreen = () => {
  const navigation = useNavigation<BookingScreenNavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { doctorId } = route.params;
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.toLowerCase().startsWith('it') ? 'it-IT' : 'en-US';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(Number.isFinite(value) ? value : 0);
  };
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    doctorId: doctorId || '',
    patientId: userId || '',
    selectedSpecialization: '',
    selectedServices: [] as number[],
    bookingType: 'VISIT' as 'VISIT' | 'ONLINE',
    appointmentDate: '',
    appointmentTime: '',
    patientNotes: '',
    clinicName: '',
    paymentMethod: 'DUMMY',
    amount: 0,
  });

  const steps = useMemo(
    () => [
      { id: 1, label: t('appointments.booking.steps.specialty') },
      { id: 2, label: t('appointments.booking.steps.appointmentType') },
      { id: 3, label: t('appointments.booking.steps.dateTime') },
      { id: 4, label: t('appointments.booking.steps.basicInfo') },
      { id: 5, label: t('appointments.booking.steps.payment') },
      { id: 6, label: t('appointments.booking.steps.confirmation') },
    ],
    [t]
  );

  // Fetch doctor profile
  const { data: doctorResponse, isLoading: doctorLoading, error: doctorError } = useQuery({
    queryKey: ['doctorProfile', doctorId],
    queryFn: () => doctorApi.getDoctorProfileById(doctorId),
    enabled: !!doctorId,
    retry: 1,
  });

  // Fetch available slots when date is selected
  const { data: availableSlotsResponse, isLoading: slotsLoading } = useQuery({
    queryKey: ['availableSlots', doctorId, formData.appointmentDate],
    queryFn: () => scheduleApi.getAvailableSlotsForDate(doctorId, formData.appointmentDate),
    enabled: !!doctorId && !!formData.appointmentDate,
    retry: 1,
  });

  // Extract doctor data
  const doctor = useMemo(() => {
    if (!doctorResponse?.data) return null;
    const responseData = doctorResponse.data;
    return typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : null;
  }, [doctorResponse]);

  // Extract available slots
  const availableSlots = useMemo(() => {
    if (!availableSlotsResponse?.data) return [];
    const responseData = availableSlotsResponse.data;
    if (Array.isArray(responseData)) return responseData;
    if (responseData.slots && Array.isArray(responseData.slots)) return responseData.slots;
    return [];
  }, [availableSlotsResponse]);

  // Get doctor's specialization
  const doctorSpecialization = useMemo(() => {
    if (!doctor?.specialization) return null;
    const spec = doctor.specialization;
    if (typeof spec === 'string') return null; // Not populated
    if (typeof spec === 'object' && spec !== null) return spec;
    return null;
  }, [doctor]);

  // Get doctor's services
  const doctorServices = useMemo(() => {
    if (!doctor?.services) return [];
    return Array.isArray(doctor.services) ? doctor.services : [];
  }, [doctor]);

  // Get doctor info helpers
  const doctorName = useMemo(() => {
    return doctor?.userId?.fullName || doctor?.fullName || t('common.unknownDoctor');
  }, [doctor]);

  const doctorImage = useMemo(() => {
    return doctor?.userId?.profileImage || doctor?.profileImage || null;
  }, [doctor]);

  const doctorLocation = useMemo(() => {
    if (!doctor?.clinics?.[0]) return t('appointments.booking.doctor.locationNotAvailable');
    const clinic = doctor.clinics[0];
    const address = `${clinic.address || ''}, ${clinic.city || ''}`.trim();
    const cityState = `${clinic.city || ''}, ${clinic.state || ''}`.trim();
    return address || cityState || t('appointments.booking.doctor.locationNotAvailable');
  }, [doctor]);

  const doctorRating = useMemo(() => {
    return doctor?.ratingAvg || doctor?.rating?.average || 0;
  }, [doctor]);

  const doctorSpecializationName = useMemo(() => {
    if (doctorSpecialization?.name) return doctorSpecialization.name;
    if (doctor?.specialization?.name) return doctor.specialization.name;
    return t('appointments.details.notSpecified');
  }, [doctorSpecialization, doctor]);

  // Set specialization when doctor loads
  useEffect(() => {
    if (doctor && !formData.selectedSpecialization && doctorSpecialization) {
      const specId = doctorSpecialization._id || doctorSpecialization;
      if (specId) {
        setFormData(prev => ({ ...prev, selectedSpecialization: String(specId) }));
      }
    }
  }, [doctor, doctorSpecialization, formData.selectedSpecialization]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: {
      doctorId: string;
      patientId: string;
      appointmentDate: string;
      appointmentTime: string;
      timezone?: string;
      timezoneOffset?: number;
      bookingType: 'VISIT' | 'ONLINE';
      patientNotes?: string;
      clinicName?: string;
    }) => appointmentApi.createAppointment(data),
    onSuccess: (response) => {
      const appointment = response.data || response;
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('appointments.booking.toasts.requestCreated'),
      });
      // Navigate to the Appointments tab (works even if Booking was opened from Home stack)
      try {
        const parent = (navigation as any).getParent?.();
        if (parent) {
          parent.navigate('Appointments', { screen: 'AppointmentsScreen' });
          return;
        }
      } catch {
        // ignore
      }

      // Fallback: if already inside the Appointments stack
      navigation.navigate('AppointmentsScreen');
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('appointments.booking.errors.failedToCreateAppointmentFallback');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Update form data
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle service selection
  const handleServiceToggle = (serviceIndex: number) => {
    setFormData(prev => {
      const services = prev.selectedServices.includes(serviceIndex)
        ? prev.selectedServices.filter(idx => idx !== serviceIndex)
        : [...prev.selectedServices, serviceIndex];
      return { ...prev, selectedServices: services };
    });
  };

  // Handle next step
  const handleNext = () => {
    // Validation based on current step
    if (currentStep === 3) {
      if (!formData.appointmentDate || !formData.appointmentTime) {
        Toast.show({
          type: 'error',
          text1: t('appointments.booking.validation.title'),
          text2: t('appointments.booking.validation.selectDateTime'),
        });
        return;
      }
    }
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: t('appointments.booking.auth.loginRequiredTitle'),
        text2: t('appointments.booking.auth.loginRequiredBody'),
      });
      return;
    }

    const getTimezoneOffsetForLocalDateTime = (dateStr: string, timeStr: string) => {
      const [year, month, day] = String(dateStr).split('-').map((x) => Number(x));
      const [hours, minutes] = String(timeStr).split(':').map((x) => Number(x));

      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return -new Date().getTimezoneOffset();
      }

      const dt = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return -dt.getTimezoneOffset();
    };

    const appointmentData = {
      doctorId: formData.doctorId,
      patientId: userId!,
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,
      timezone: Localization.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: getTimezoneOffsetForLocalDateTime(formData.appointmentDate, formData.appointmentTime),
      bookingType: formData.bookingType,
      patientNotes: formData.patientNotes || undefined,
      clinicName: formData.clinicName || undefined,
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get calendar dates for current month
  const calendarDates = useMemo(() => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarDate);
    const dates: Array<{ date: number; fullDate: string; isPast: boolean; isToday: boolean; isSelected: boolean }> = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push({ date: 0, fullDate: '', isPast: true, isToday: false, isSelected: false });
    }
    
    // Add all days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = formData.appointmentDate ? new Date(formData.appointmentDate) : null;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const fullDate = date.toISOString().split('T')[0];
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate ? date.getTime() === selectedDate.getTime() : false;
      
      dates.push({ date: day, fullDate, isPast, isToday, isSelected });
    }
    
    return dates;
  }, [calendarDate, formData.appointmentDate]);

  const handleDateSelect = (fullDate: string) => {
    if (fullDate) {
      updateFormData('appointmentDate', fullDate);
      updateFormData('appointmentTime', ''); // Reset time when date changes
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(calendarDate);
  }, [calendarDate, locale]);

  const dayNames = useMemo(() => {
    const baseSunday = new Date(Date.UTC(2021, 7, 1));
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(baseSunday.getTime() + idx * 86400000);
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
    });
  }, [locale]);

  // Handle missing doctorId
  if (!doctorId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>{t('appointments.booking.errors.doctorIdRequiredTitle')}</Text>
          <Text style={styles.errorText}>{t('appointments.booking.errors.doctorIdRequiredBody')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressScroll}>
            {steps.map((step) => (
              <View key={step.id} style={styles.stepContainer}>
                <View style={[styles.stepCircle, currentStep >= step.id && styles.stepCircleActive]}>
                  <Text style={[styles.stepNumber, currentStep >= step.id && styles.stepNumberActive]}>
                    {step.id}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= step.id && styles.stepLabelActive]} numberOfLines={1}>
                  {step.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {doctorLoading && !doctor ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('appointments.booking.loading.loadingDoctor')}</Text>
          </View>
        ) : doctorError && !doctor ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.errorTitle}>{t('appointments.booking.errors.errorLoadingDoctorTitle')}</Text>
            <Text style={styles.errorText}>
              {doctorError instanceof Error
                ? doctorError.message
                : t('appointments.booking.errors.failedToLoadDoctorFallback')}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
          {/* Doctor Info Card */}
          <View style={styles.doctorCard}>
            <View style={styles.doctorHeader}>
              <Image
                source={doctorImage ? { uri: normalizeImageUrl(doctorImage) || '' } : defaultAvatar}
                style={styles.doctorImage}
                defaultSource={defaultAvatar}
              />
              <View style={styles.doctorInfo}>
                <View style={styles.doctorNameRow}>
                  <Text style={styles.doctorName}>{doctorName}</Text>
                  {doctorRating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#FFB800" />
                      <Text style={styles.ratingText}>{doctorRating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.specialty}>{doctorSpecializationName}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText} numberOfLines={2}>
                    {doctorLocation}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Step 1: Select Specialty */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('appointments.booking.labels.specialty')}</Text>
                {doctorSpecialization ? (
                  <View style={styles.specialtyDisplay}>
                    <Text style={styles.specialtyDisplayText}>{doctorSpecializationName}</Text>
                  </View>
                ) : (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={20} color={colors.warning} />
                    <Text style={styles.warningText}>
                      {t('appointments.booking.warnings.noSpecialization')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.servicesSection}>
                <Text style={styles.sectionTitle}>{t('appointments.booking.sections.services')}</Text>
                {doctorServices.length > 0 ? (
                  <View style={styles.servicesGrid}>
                    {doctorServices.map((service: any, index: number) => {
                      const isSelected = formData.selectedServices.includes(index);
                      const serviceName = service.name || service;
                      const servicePrice = service.price || 0;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.serviceCard,
                            isSelected && styles.serviceCardActive,
                          ]}
                          onPress={() => handleServiceToggle(index)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.serviceCheckbox,
                            isSelected && styles.serviceCheckboxActive,
                          ]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color={colors.textWhite} />
                            )}
                          </View>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceTitle}>{serviceName}</Text>
                            {servicePrice > 0 && (
                              <Text style={styles.servicePrice}>{formatCurrency(servicePrice)}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      {t('appointments.booking.info.noServices')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 2: Appointment Type */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('appointments.booking.titles.selectAppointmentType')}</Text>
              <View style={styles.appointmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.appointmentTypeCard,
                    formData.bookingType === 'VISIT' && styles.appointmentTypeCardActive,
                  ]}
                  onPress={() => updateFormData('bookingType', 'VISIT')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="business-outline"
                    size={48}
                    color={formData.bookingType === 'VISIT' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.appointmentTypeTitle}>{t('appointments.booking.appointmentType.visitTitle')}</Text>
                  <Text style={styles.appointmentTypeDescription}>{t('appointments.booking.appointmentType.visitDescription')}</Text>
                  {formData.bookingType === 'VISIT' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <Text style={styles.selectedText}>{t('appointments.booking.labels.selected')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.appointmentTypeCard,
                    formData.bookingType === 'ONLINE' && styles.appointmentTypeCardActive,
                  ]}
                  onPress={() => updateFormData('bookingType', 'ONLINE')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={48}
                    color={formData.bookingType === 'ONLINE' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.appointmentTypeTitle}>{t('appointments.booking.appointmentType.onlineTitle')}</Text>
                  <Text style={styles.appointmentTypeDescription}>{t('appointments.booking.appointmentType.onlineDescription')}</Text>
                  {formData.bookingType === 'ONLINE' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <Text style={styles.selectedText}>{t('appointments.booking.labels.selected')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Date & Time */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('appointments.booking.titles.selectDateTime')}</Text>
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.booking.labels.selectDate')}</Text>
                  
                  {/* Calendar */}
                  <View style={styles.calendarContainer}>
                    {/* Calendar Header */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity
                        style={styles.calendarNavButton}
                        onPress={() => navigateMonth('prev')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-back" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.calendarMonthText}>
                        {monthLabel} {calendarDate.getFullYear()}
                      </Text>
                      <TouchableOpacity
                        style={styles.calendarNavButton}
                        onPress={() => navigateMonth('next')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Day Names */}
                    <View style={styles.calendarDayNames}>
                      {dayNames.map((day) => (
                        <View key={day} style={styles.calendarDayName}>
                          <Text style={styles.calendarDayNameText}>{day}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Calendar Dates */}
                    <View style={styles.calendarDates}>
                      {calendarDates.map((item, index) => {
                        if (item.date === 0) {
                          return <View key={index} style={styles.calendarDateCell} />;
                        }
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.calendarDateCell,
                              item.isToday && styles.calendarDateCellToday,
                              item.isSelected && styles.calendarDateCellSelected,
                              item.isPast && styles.calendarDateCellPast,
                            ]}
                            onPress={() => !item.isPast && handleDateSelect(item.fullDate)}
                            disabled={item.isPast}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.calendarDateText,
                                item.isToday && styles.calendarDateTextToday,
                                item.isSelected && styles.calendarDateTextSelected,
                                item.isPast && styles.calendarDateTextPast,
                              ]}
                            >
                              {item.date}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Selected Date Display */}
                    {formData.appointmentDate && (
                      <View style={styles.selectedDateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                        <Text style={styles.selectedDateText}>
                          {t('appointments.booking.labels.selectedDate', { date: formatDate(formData.appointmentDate) })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.timeSlotsContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.booking.labels.availableTimeSlots')}</Text>
                  {slotsLoading ? (
                    <View style={styles.loadingSlots}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingSlotsText}>{t('appointments.booking.loading.loadingSlots')}</Text>
                    </View>
                  ) : availableSlots.length === 0 ? (
                    <View style={styles.noSlotsBox}>
                      <Text style={styles.noSlotsText}>
                        {formData.appointmentDate
                          ? t('appointments.booking.slots.noneForDate')
                          : t('appointments.booking.slots.selectDateFirst')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.timeSlotsGrid}>
                      {availableSlots.map((slot: any, index: number) => {
                        const slotTime = slot.startTime || slot;
                        const isSelected = formData.appointmentTime === slotTime;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timeSlotButton,
                              isSelected && styles.timeSlotButtonActive,
                            ]}
                            onPress={() => updateFormData('appointmentTime', slotTime)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.timeSlotText,
                                isSelected && styles.timeSlotTextActive,
                              ]}
                            >
                              {slotTime}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Step 4: Basic Information */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('appointments.booking.titles.basicInformation')}</Text>
              <View style={styles.basicInfoContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.booking.labels.patientNotesOptional')}</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.patientNotes}
                    onChangeText={(text) => updateFormData('patientNotes', text)}
                    placeholder={t('appointments.booking.placeholders.patientNotes')}
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                {formData.bookingType === 'VISIT' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('appointments.booking.labels.clinicNameOptional')}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.clinicName}
                      onChangeText={(text) => updateFormData('clinicName', text)}
                      placeholder={t('appointments.booking.placeholders.clinicName')}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('appointments.booking.titles.payment')}</Text>
              <View style={styles.paymentContainer}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {t('appointments.booking.info.paymentOptional')}
                  </Text>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.booking.labels.paymentMethod')}</Text>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerText}>
                      {formData.paymentMethod === 'DUMMY' ? t('appointments.booking.paymentMethods.dummy') :
                       formData.paymentMethod === 'CARD' ? t('appointments.booking.paymentMethods.card') :
                       formData.paymentMethod === 'PAYPAL' ? t('appointments.booking.paymentMethods.paypal') :
                       formData.paymentMethod === 'BANK' ? t('appointments.booking.paymentMethods.bank') : formData.paymentMethod}
                    </Text>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.booking.labels.amountOptional')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.amount > 0 ? formData.amount.toString() : ''}
                    onChangeText={(text) => {
                      const amount = parseFloat(text) || 0;
                      updateFormData('amount', amount);
                    }}
                    placeholder={t('appointments.booking.placeholders.amount')}
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 6 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('appointments.booking.titles.confirmAppointment')}</Text>
              <View style={styles.confirmationContainer}>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.doctor')}</Text>
                  <Text style={styles.confirmationValue}>{doctorName}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.specialization')}</Text>
                  <Text style={styles.confirmationValue}>{doctorSpecializationName}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.appointmentType')}</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.bookingType === 'VISIT'
                      ? t('appointments.booking.appointmentType.visitTitle')
                      : t('appointments.booking.appointmentType.onlineTitle')}
                  </Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.date')}</Text>
                  <Text style={styles.confirmationValue}>{formatDate(formData.appointmentDate)}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.time')}</Text>
                  <Text style={styles.confirmationValue}>{formData.appointmentTime || t('common.na')}</Text>
                </View>
                {formData.clinicName && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.clinic')}</Text>
                    <Text style={styles.confirmationValue}>{formData.clinicName}</Text>
                  </View>
                )}
                {formData.patientNotes && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.notes')}</Text>
                    <Text style={styles.confirmationValue}>{formData.patientNotes}</Text>
                  </View>
                )}
                {formData.amount > 0 && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>{t('appointments.booking.confirmation.paymentAmount')}</Text>
                    <Text style={styles.confirmationValue}>{formatCurrency(formData.amount)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={styles.backBtnText}>{t('common.prev')}</Text>
            </TouchableOpacity>
            {currentStep === 6 ? (
              <TouchableOpacity
                style={[styles.nextBtn, createAppointmentMutation.isPending && styles.nextBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color={colors.textWhite} style={{ marginRight: 8 }} />
                    <Text style={styles.nextBtnText}>{t('appointments.booking.actions.creating')}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>{t('appointments.booking.actions.confirmAppointment')}</Text>
                    <Ionicons name="checkmark" size={18} color={colors.textWhite} />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextBtnText}>
                  {currentStep === 5
                    ? t('appointments.booking.actions.reviewConfirm')
                    : t('appointments.booking.actions.nextWithLabel', { label: steps[currentStep]?.label })}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textWhite} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  progressContainer: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressScroll: {
    paddingHorizontal: 16,
  },
  stepContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.textWhite,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  doctorCard: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorHeader: {
    flexDirection: 'row',
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 3,
  },
  specialty: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  specialtyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  specialtyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  specialtyTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  servicesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '47%',
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  serviceCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  serviceCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.background,
  },
  serviceCheckboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
    marginRight: 6,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  specialtyDisplay: {
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  specialtyDisplayText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: colors.info + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  appointmentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  appointmentTypeCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  appointmentTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  appointmentTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  appointmentTypeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  selectedText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  dateTimeContainer: {
    marginTop: 16,
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayName: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDateCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calendarDateCellToday: {
    backgroundColor: colors.primary + '20',
    borderRadius: 20,
  },
  calendarDateCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  calendarDateCellPast: {
    opacity: 0.3,
  },
  calendarDateText: {
    fontSize: 14,
    color: colors.text,
  },
  calendarDateTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  calendarDateTextSelected: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  calendarDateTextPast: {
    color: colors.textSecondary,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  timeSlotsContainer: {
    marginTop: 8,
  },
  loadingSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingSlotsText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  noSlotsBox: {
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 8,
  },
  noSlotsText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 80,
    alignItems: 'center',
  },
  timeSlotButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  timeSlotText: {
    fontSize: 14,
    color: colors.text,
  },
  timeSlotTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  basicInfoContainer: {
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentContainer: {
    marginTop: 16,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 14,
    color: colors.text,
  },
  confirmationContainer: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  confirmationRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
    minWidth: 120,
  },
  confirmationValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default BookingScreen;

