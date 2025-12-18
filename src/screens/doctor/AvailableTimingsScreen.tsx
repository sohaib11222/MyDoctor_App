import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';

type AvailableTimingsScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'AvailableTimings'>;

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AvailableTimingsScreen = () => {
  const navigation = useNavigation<AvailableTimingsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'general' | 'clinic'>('general');
  const [activeDay, setActiveDay] = useState(0);
  const [appointmentFee, setAppointmentFee] = useState('254');
  const [timeSlots, setTimeSlots] = useState<{ [key: string]: string[] }>({
    Monday: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  const handleAddSlot = () => {
    Alert.prompt(
      'Add Time Slot',
      'Enter time (e.g., 09:00 AM)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (time) => {
            if (time) {
              const currentDay = days[activeDay];
              setTimeSlots({
                ...timeSlots,
                [currentDay]: [...timeSlots[currentDay], time],
              });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteSlot = (slot: string) => {
    const currentDay = days[activeDay];
    setTimeSlots({
      ...timeSlots,
      [currentDay]: timeSlots[currentDay].filter((s) => s !== slot),
    });
  };

  const handleDeleteAll = () => {
    Alert.alert('Delete All Slots', 'Are you sure you want to delete all slots for this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const currentDay = days[activeDay];
          setTimeSlots({
            ...timeSlots,
            [currentDay]: [],
          });
        },
      },
    ]);
  };

  const handleSave = () => {
    Alert.alert('Success', 'Availability timings saved successfully');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Tabs */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'general' && styles.mainTabActive]}
          onPress={() => setActiveTab('general')}
        >
          <Text style={[styles.mainTabText, activeTab === 'general' && styles.mainTabTextActive]}>
            General Availability
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'clinic' && styles.mainTabActive]}
          onPress={() => setActiveTab('clinic')}
        >
          <Text style={[styles.mainTabText, activeTab === 'clinic' && styles.mainTabTextActive]}>
            Clinic Availability
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'clinic' && (
        <View style={styles.clinicSelector}>
          <Text style={styles.clinicLabel}>Select Clinic</Text>
          <TouchableOpacity style={styles.clinicButton}>
            <Text style={styles.clinicButtonText}>The Family Dentistry Clinic</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Available Slots</Text>

          {/* Day Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayTabsContainer}
            contentContainerStyle={styles.dayTabsContent}
          >
            {days.map((day, index) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, activeDay === index && styles.dayTabActive]}
                onPress={() => setActiveDay(index)}
              >
                <Text style={[styles.dayTabText, activeDay === index && styles.dayTabTextActive]}>
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time Slots */}
          <View style={styles.slotBox}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotDayTitle}>{days[activeDay]}</Text>
              <View style={styles.slotActions}>
                <TouchableOpacity style={styles.slotActionBtn} onPress={handleAddSlot}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.slotActionText}>Add Slots</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.slotActionBtn} onPress={handleDeleteAll}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.slotActionText, { color: colors.error }]}>Delete All</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.slotBody}>
              {timeSlots[days[activeDay]].length === 0 ? (
                <Text style={styles.noSlotsText}>No Slots Available</Text>
              ) : (
                <View style={styles.timeSlotsGrid}>
                  {timeSlots[days[activeDay]].map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.timeSlot}
                      onPress={() => handleDeleteSlot(slot)}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.timeSlotText}>{slot}</Text>
                      <Ionicons name="close-circle" size={18} color={colors.error} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Appointment Fee */}
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Appointment Fees ($)</Text>
            <TextInput
              style={styles.feeInput}
              value={appointmentFee}
              onChangeText={setAppointmentFee}
              keyboardType="numeric"
              placeholder="254"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Save Changes"
              onPress={handleSave}
              style={styles.saveButton}
            />
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
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: {
    borderBottomColor: colors.primary,
  },
  mainTabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  mainTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  clinicSelector: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clinicLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  clinicButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clinicButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
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
  noSlotsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timeSlotText: {
    fontSize: 13,
    color: colors.text,
  },
  feeContainer: {
    marginBottom: 20,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  feeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.backgroundLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

