import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import * as weeklyScheduleApi from '../../services/weeklySchedule';
import { to12Hour, isValidTime, isStartBeforeEnd } from '../../utils/timeFormat';
import Toast from 'react-native-toast-message';

type AvailableTimingsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AvailableTimings'>;

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const APPOINTMENT_DURATIONS = [15, 30, 45, 60];

export const AvailableTimingsScreen = () => {
  const navigation = useNavigation<AvailableTimingsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState('Monday');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedSlot, setSelectedSlot] = useState<weeklyScheduleApi.TimeSlot | null>(null);
  const [selectedDayForModal, setSelectedDayForModal] = useState('Monday');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);

  // Form state for modal - 12-hour format
  const [startHour, setStartHour] = useState('9');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM');
  
  // 24-hour format for backend
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [errors, setErrors] = useState<{ startTime?: string; endTime?: string }>({});

  // Fetch weekly schedule
  const { data: scheduleData, isLoading, error, refetch } = useQuery({
    queryKey: ['weeklySchedule'],
    queryFn: async () => {
      const response = await weeklyScheduleApi.getWeeklySchedule();
      return response.data || response;
    },
  });

  // Get schedule data or default
  const schedule = scheduleData || {
    appointmentDuration: 30,
    days: [],
  };

  // Get time slots for a specific day
  const getDaySlots = (dayOfWeek: string): weeklyScheduleApi.TimeSlot[] => {
    const daySchedule = schedule.days?.find((day: weeklyScheduleApi.DaySchedule) => day.dayOfWeek === dayOfWeek);
    return daySchedule?.timeSlots || [];
  };

  // Add time slot mutation
  const addSlotMutation = useMutation({
    mutationFn: ({ dayOfWeek, timeSlot }: { dayOfWeek: string; timeSlot: weeklyScheduleApi.TimeSlot }) =>
      weeklyScheduleApi.addTimeSlot(dayOfWeek, timeSlot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Time slot added successfully!',
      });
      setShowSlotModal(false);
      resetModal();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add time slot';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Update time slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: ({ dayOfWeek, slotId, updates }: { dayOfWeek: string; slotId: string; updates: Partial<weeklyScheduleApi.TimeSlot> }) =>
      weeklyScheduleApi.updateTimeSlot(dayOfWeek, slotId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Time slot updated successfully!',
      });
      setShowSlotModal(false);
      resetModal();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update time slot';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Delete time slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: ({ dayOfWeek, slotId }: { dayOfWeek: string; slotId: string }) =>
      weeklyScheduleApi.deleteTimeSlot(dayOfWeek, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Time slot deleted successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete time slot';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Delete all slots for a day mutation
  const deleteAllSlotsMutation = useMutation({
    mutationFn: (dayOfWeek: string) =>
      weeklyScheduleApi.upsertWeeklySchedule({ dayOfWeek, timeSlots: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'All slots deleted successfully!',
      });
      setShowDeleteConfirm(false);
      setDayToDelete(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete slots';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Update appointment duration mutation
  const updateDurationMutation = useMutation({
    mutationFn: (duration: number) =>
      weeklyScheduleApi.updateAppointmentDuration(duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment duration updated successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update duration';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Convert 24-hour to 12-hour components
  const parse24To12 = (time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } => {
    if (!time24) return { hour: '9', minute: '00', period: 'AM' };
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return {
      hour: hours12.toString(),
      minute: minutes.toString().padStart(2, '0'),
      period
    };
  };

  // Convert 12-hour components to 24-hour format
  const convert12To24 = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    let hours = parseInt(hour, 10);
    const minutes = minute.padStart(2, '0');
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Update 24-hour time when 12-hour components change
  useEffect(() => {
    if (startHour && startMinute && startPeriod) {
      const time24 = convert12To24(startHour, startMinute, startPeriod);
      setStartTime(time24);
    }
  }, [startHour, startMinute, startPeriod]);

  useEffect(() => {
    if (endHour && endMinute && endPeriod) {
      const time24 = convert12To24(endHour, endMinute, endPeriod);
      setEndTime(time24);
    }
  }, [endHour, endMinute, endPeriod]);

  // Initialize form when modal opens or slot changes
  const prevModalOpenRef = useRef(false);
  const prevSelectedSlotIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const isModalJustOpened = showSlotModal && !prevModalOpenRef.current;
    const isSlotChanged = selectedSlot?._id !== prevSelectedSlotIdRef.current;
    
    if (showSlotModal && (isModalJustOpened || isSlotChanged)) {
      if (selectedSlot && modalMode === 'edit') {
        const start12 = parse24To12(selectedSlot.startTime || '');
        const end12 = parse24To12(selectedSlot.endTime || '');
        
        setStartHour(start12.hour);
        setStartMinute(start12.minute);
        setStartPeriod(start12.period);
        setEndHour(end12.hour);
        setEndMinute(end12.minute);
        setEndPeriod(end12.period);
        
        setStartTime(selectedSlot.startTime || '');
        setEndTime(selectedSlot.endTime || '');
        setIsAvailable(selectedSlot.isAvailable !== undefined ? selectedSlot.isAvailable : true);
      } else if (modalMode === 'add' && isModalJustOpened) {
        // Default values for add mode - only when modal first opens
        setStartHour('9');
        setStartMinute('00');
        setStartPeriod('AM');
        setEndHour('10');
        setEndMinute('00');
        setEndPeriod('AM');
        setStartTime('09:00');
        setEndTime('10:00');
        setIsAvailable(true);
      }
      setErrors({});
    }
    
    prevModalOpenRef.current = showSlotModal;
    prevSelectedSlotIdRef.current = selectedSlot?._id || null;
  }, [showSlotModal, selectedSlot?._id, modalMode]);

  // Reset modal form
  const resetModal = () => {
    setStartHour('9');
    setStartMinute('00');
    setStartPeriod('AM');
    setEndHour('10');
    setEndMinute('00');
    setEndPeriod('AM');
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAvailable(true);
    setErrors({});
    setSelectedSlot(null);
  };

  // Handle add slot
  const handleAddSlot = (dayOfWeek: string) => {
    setSelectedDayForModal(dayOfWeek);
    setModalMode('add');
    resetModal();
    setShowSlotModal(true);
  };

  // Handle edit slot
  const handleEditSlot = (dayOfWeek: string, slot: weeklyScheduleApi.TimeSlot) => {
    setSelectedDayForModal(dayOfWeek);
    setModalMode('edit');
    setSelectedSlot(slot);
    // The useEffect will handle setting the 12-hour format values
    setIsAvailable(slot.isAvailable !== undefined ? slot.isAvailable : true);
    setErrors({});
    setShowSlotModal(true);
  };

  // Handle delete slot
  const handleDeleteSlot = (dayOfWeek: string, slotId: string) => {
    Alert.alert('Delete Time Slot', 'Are you sure you want to delete this time slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSlotMutation.mutate({ dayOfWeek, slotId });
        },
      },
    ]);
  };

  // Handle delete all slots
  const handleDeleteAllSlots = (dayOfWeek: string) => {
    setDayToDelete(dayOfWeek);
    setShowDeleteConfirm(true);
  };

  // Confirm delete all
  const confirmDeleteAll = () => {
    if (dayToDelete) {
      deleteAllSlotsMutation.mutate(dayToDelete);
    }
  };

  // Validate modal form
  const validateModal = (): boolean => {
    const newErrors: { startTime?: string; endTime?: string } = {};

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    } else if (!isValidTime(startTime)) {
      newErrors.startTime = 'Invalid time format. Use HH:MM (e.g., 09:00)';
    }

    if (!endTime) {
      newErrors.endTime = 'End time is required';
    } else if (!isValidTime(endTime)) {
      newErrors.endTime = 'Invalid time format. Use HH:MM (e.g., 10:00)';
    }

    if (startTime && endTime && !isStartBeforeEnd(startTime, endTime)) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save slot from modal
  const handleSaveSlot = () => {
    // Convert 12-hour format to 24-hour format
    const currentStartTime = convert12To24(startHour, startMinute, startPeriod);
    const currentEndTime = convert12To24(endHour, endMinute, endPeriod);
    
    // Update state with converted times
    setStartTime(currentStartTime);
    setEndTime(currentEndTime);
    
    // Validate using the converted times
    const newErrors: { startTime?: string; endTime?: string } = {};

    if (!currentStartTime) {
      newErrors.startTime = 'Start time is required';
    } else if (!isValidTime(currentStartTime)) {
      newErrors.startTime = 'Invalid time format. Use HH:MM (e.g., 09:00)';
    }

    if (!currentEndTime) {
      newErrors.endTime = 'End time is required';
    } else if (!isValidTime(currentEndTime)) {
      newErrors.endTime = 'Invalid time format. Use HH:MM (e.g., 10:00)';
    }

    if (currentStartTime && currentEndTime && !isStartBeforeEnd(currentStartTime, currentEndTime)) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const slotData: weeklyScheduleApi.TimeSlot = {
      startTime: currentStartTime,
      endTime: currentEndTime,
      isAvailable,
    };

    if (modalMode === 'edit' && selectedSlot?._id) {
      updateSlotMutation.mutate({
        dayOfWeek: selectedDayForModal,
        slotId: selectedSlot._id,
        updates: slotData,
      });
    } else {
      addSlotMutation.mutate({
        dayOfWeek: selectedDayForModal,
        timeSlot: slotData,
      });
    }
  };

  // Handle duration change
  const handleDurationChange = (duration: string) => {
    updateDurationMutation.mutate(parseInt(duration, 10));
  };

  // Render time slots for a day
  const renderTimeSlots = (dayOfWeek: string) => {
    const slots = getDaySlots(dayOfWeek);

    if (slots.length === 0) {
      return (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>No Slots Available</Text>
        </View>
      );
    }

    return (
      <View style={styles.timeSlotsGrid}>
        {slots.map((slot) => (
          <View key={slot._id || `${slot.startTime}-${slot.endTime}`} style={styles.timeSlotCard}>
            <View style={styles.timeSlotContent}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.timeSlotText}>
                {to12Hour(slot.startTime)} - {to12Hour(slot.endTime)}
              </Text>
              {!slot.isAvailable && (
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableText}>Unavailable</Text>
                </View>
              )}
            </View>
            <View style={styles.timeSlotActions}>
              <TouchableOpacity
                style={styles.slotActionButton}
                onPress={() => handleEditSlot(dayOfWeek, slot)}
                disabled={deleteSlotMutation.isPending || updateSlotMutation.isPending}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.slotActionButton}
                onPress={() => slot._id && handleDeleteSlot(dayOfWeek, slot._id)}
                disabled={deleteSlotMutation.isPending || updateSlotMutation.isPending}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Schedule</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load schedule'}
          </Text>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Available Slots</Text>

            {/* Day Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayTabsContainer}
              contentContainerStyle={styles.dayTabsContent}
            >
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, activeDay === day && styles.dayTabActive]}
                  onPress={() => setActiveDay(day)}
                >
                  <Text style={[styles.dayTabText, activeDay === day && styles.dayTabTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Day Content */}
            <View style={styles.slotBox}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotDayTitle}>{activeDay}</Text>
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={styles.slotActionBtn}
                    onPress={() => handleAddSlot(activeDay)}
                    disabled={isLoading}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.slotActionText}>Add Slots</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.slotActionBtn}
                    onPress={() => handleDeleteAllSlots(activeDay)}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.slotActionText, { color: colors.error }]}>Delete All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.slotBody}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  renderTimeSlots(activeDay)
                )}
              </View>
            </View>

            {/* Appointment Duration */}
            <View style={styles.durationContainer}>
              <Text style={styles.durationLabel}>
                Appointment Duration (minutes) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.durationSelect}>
                {APPOINTMENT_DURATIONS.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      schedule.appointmentDuration === duration && styles.durationOptionActive,
                    ]}
                    onPress={() => handleDurationChange(duration.toString())}
                    disabled={updateDurationMutation.isPending}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        schedule.appointmentDuration === duration && styles.durationOptionTextActive,
                      ]}
                    >
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.durationHint}>Default duration for appointments</Text>
            </View>
          </View>
        </ScrollView>

      {/* Time Slot Modal */}
      <Modal
        visible={showSlotModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSlotModal(false);
          resetModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'edit' ? 'Edit Time Slot' : 'Add Time Slot'} - {selectedDayForModal}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSlotModal(false);
                  resetModal();
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Start Time <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerRow}>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Hour</Text>
                      <View style={[styles.pickerContainer, errors.startTime && styles.pickerError]}>
                        <ScrollView 
                          style={styles.pickerScroll} 
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <TouchableOpacity
                              key={hour}
                              style={[
                                styles.pickerOption,
                                startHour === hour.toString() && styles.pickerOptionActive,
                              ]}
                              onPress={() => {
                                setStartHour(hour.toString());
                              }}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  startHour === hour.toString() && styles.pickerOptionTextActive,
                                ]}
                              >
                                {hour}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <Text style={styles.timeSeparator}>:</Text>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Minute</Text>
                      <View style={[styles.pickerContainer, errors.startTime && styles.pickerError]}>
                        <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                          {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((min) => (
                            <TouchableOpacity
                              key={min}
                              style={[
                                styles.pickerOption,
                                startMinute === min && styles.pickerOptionActive,
                              ]}
                              onPress={() => setStartMinute(min)}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  startMinute === min && styles.pickerOptionTextActive,
                                ]}
                              >
                                {min}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Period</Text>
                      <View style={[styles.pickerContainer, errors.startTime && styles.pickerError]}>
                        <ScrollView 
                          style={styles.pickerScroll} 
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          <TouchableOpacity
                            style={[
                              styles.pickerOption,
                              startPeriod === 'AM' && styles.pickerOptionActive,
                            ]}
                            onPress={() => {
                              setStartPeriod('AM');
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                startPeriod === 'AM' && styles.pickerOptionTextActive,
                              ]}
                            >
                              AM
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.pickerOption,
                              startPeriod === 'PM' && styles.pickerOptionActive,
                            ]}
                            onPress={() => {
                              setStartPeriod('PM');
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                startPeriod === 'PM' && styles.pickerOptionTextActive,
                              ]}
                            >
                              PM
                            </Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                </View>
                {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
                <Text style={styles.formHint}>
                  Selected: {startHour}:{startMinute} {startPeriod} ({startTime && to12Hour(startTime)})
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  End Time <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerRow}>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Hour</Text>
                      <View style={[styles.pickerContainer, errors.endTime && styles.pickerError]}>
                        <ScrollView 
                          style={styles.pickerScroll} 
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <TouchableOpacity
                              key={hour}
                              style={[
                                styles.pickerOption,
                                endHour === hour.toString() && styles.pickerOptionActive,
                              ]}
                              onPress={() => {
                                setEndHour(hour.toString());
                              }}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  endHour === hour.toString() && styles.pickerOptionTextActive,
                                ]}
                              >
                                {hour}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <Text style={styles.timeSeparator}>:</Text>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Minute</Text>
                      <View style={[styles.pickerContainer, errors.endTime && styles.pickerError]}>
                        <ScrollView 
                          style={styles.pickerScroll} 
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((min) => (
                            <TouchableOpacity
                              key={min}
                              style={[
                                styles.pickerOption,
                                endMinute === min && styles.pickerOptionActive,
                              ]}
                              onPress={() => {
                                setEndMinute(min);
                              }}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  endMinute === min && styles.pickerOptionTextActive,
                                ]}
                              >
                                {min}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <View style={styles.pickerWrapper}>
                      <Text style={styles.pickerLabel}>Period</Text>
                      <View style={[styles.pickerContainer, errors.endTime && styles.pickerError]}>
                        <ScrollView 
                          style={styles.pickerScroll} 
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          <TouchableOpacity
                            style={[
                              styles.pickerOption,
                              endPeriod === 'AM' && styles.pickerOptionActive,
                            ]}
                            onPress={() => {
                              setEndPeriod('AM');
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                endPeriod === 'AM' && styles.pickerOptionTextActive,
                              ]}
                            >
                              AM
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.pickerOption,
                              endPeriod === 'PM' && styles.pickerOptionActive,
                            ]}
                            onPress={() => {
                              setEndPeriod('PM');
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                endPeriod === 'PM' && styles.pickerOptionTextActive,
                              ]}
                            >
                              PM
                            </Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                </View>
                {errors.endTime && <Text style={styles.errorText}>{errors.endTime}</Text>}
                <Text style={styles.formHint}>
                  Selected: {endHour}:{endMinute} {endPeriod} ({endTime && to12Hour(endTime)})
                </Text>
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setIsAvailable(!isAvailable)}
                >
                  <View style={[styles.checkbox, isAvailable && styles.checkboxChecked]}>
                    {isAvailable && <Ionicons name="checkmark" size={16} color={colors.textWhite} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Available</Text>
                </TouchableOpacity>
                <Text style={styles.formHint}>Uncheck to mark this slot as unavailable</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowSlotModal(false);
                  resetModal();
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={modalMode === 'edit' ? 'Update Slot' : 'Add Slot'}
                onPress={handleSaveSlot}
                style={styles.modalButton}
                disabled={addSlotMutation.isPending || updateSlotMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteConfirm(false);
          setDayToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete all time slots for <Text style={styles.bold}>{dayToDelete}</Text>?
            </Text>
            <Text style={styles.confirmModalHint}>This action cannot be undone.</Text>
            <View style={styles.confirmModalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDayToDelete(null);
                }}
                variant="outline"
                style={styles.confirmModalButton}
                disabled={deleteAllSlotsMutation.isPending}
              />
              <Button
                title={deleteAllSlotsMutation.isPending ? 'Deleting...' : 'Delete All'}
                onPress={confirmDeleteAll}
                style={[styles.confirmModalButton, { backgroundColor: colors.error }]}
                disabled={deleteAllSlotsMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  dayTabsContainer: {
    marginBottom: 16,
  },
  dayTabsContent: {
    paddingVertical: 8,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
  },
  dayTabActive: {
    backgroundColor: colors.primary,
  },
  dayTabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayTabTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  slotBox: {
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 12,
  },
  slotActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  slotBody: {
    minHeight: 100,
  },
  noSlotsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeSlotsGrid: {
    gap: 8,
  },
  timeSlotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timeSlotText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  unavailableBadge: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  unavailableText: {
    fontSize: 11,
    color: colors.textWhite,
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  slotActionButton: {
    padding: 4,
  },
  durationContainer: {
    marginTop: 20,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  durationSelect: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  durationOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  durationOptionTextActive: {
    color: colors.textWhite,
  },
  durationHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
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
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  formHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.backgroundLight,
  },
  formInputError: {
    borderColor: colors.error,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
  },
  confirmModalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
  },
  confirmModalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
  },
  timePickerContainer: {
    marginTop: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickerWrapper: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  pickerContainer: {
    height: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    overflow: 'hidden',
  },
  pickerError: {
    borderColor: colors.error,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  pickerOptionTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 28,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
});
