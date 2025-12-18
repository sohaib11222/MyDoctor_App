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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

type StartAppointmentScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'StartAppointment'>;
type StartAppointmentRouteProp = RouteProp<AppointmentsStackParamList, 'StartAppointment'>;

export const StartAppointmentScreen = () => {
  const navigation = useNavigation<StartAppointmentScreenNavigationProp>();
  const route = useRoute<StartAppointmentRouteProp>();
  const { appointmentId } = route.params;
  const [sessionTime, setSessionTime] = useState({ minutes: 8, seconds: 0 });
  const [isActive, setIsActive] = useState(false);

  // Mock patient data
  const patient = {
    id: appointmentId,
    name: 'Kelly Joseph',
    patientId: '#P0001',
    age: 28,
    gender: 'Female',
    bloodGroup: 'O+ve',
    address: 'Newyork, United States',
    visits: 0,
    img: require('../../../assets/avatar.png'),
  };

  // Form states
  const [vitals, setVitals] = useState({
    temperature: '',
    pulse: '',
    respiratoryRate: '',
    spo2: '',
    height: '',
    weight: '',
    waist: '',
    bsa: '',
    bmi: '',
  });
  const [previousHistory, setPreviousHistory] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const handleStartSession = () => {
    setIsActive(true);
    // Start timer logic would go here
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this appointment session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            // Save appointment details
            Alert.alert('Success', 'Appointment session ended successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Patient Info Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.patientInfo}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.patientDetails}>
                <Text style={styles.patientId}>{patient.id}</Text>
                <Text style={styles.patientName}>{patient.name}</Text>
              </View>
            </View>
            {isActive && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Session Ends in</Text>
                <Text style={styles.timer}>
                  {String(sessionTime.minutes).padStart(2, '0')}M:{String(sessionTime.seconds).padStart(2, '0')}S
                </Text>
              </View>
            )}
          </View>

          <View style={styles.patientInfoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age / Gender</Text>
              <Text style={styles.infoValue}>{patient.age} Years / {patient.gender}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{patient.address}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Blood Group</Text>
              <Text style={styles.infoValue}>{patient.bloodGroup}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>No of Visit</Text>
              <Text style={styles.infoValue}>{patient.visits}</Text>
            </View>
          </View>
        </View>

        {/* Vitals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitals</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Temperature</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="97.8"
                  value={vitals.temperature}
                  onChangeText={(text) => setVitals({ ...vitals, temperature: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>F</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Pulse</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="454"
                  value={vitals.pulse}
                  onChangeText={(text) => setVitals({ ...vitals, pulse: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>mmHg</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Respiratory Rate</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="97.8"
                  value={vitals.respiratoryRate}
                  onChangeText={(text) => setVitals({ ...vitals, respiratoryRate: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>rpm</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>SPO2</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="98"
                  value={vitals.spo2}
                  onChangeText={(text) => setVitals({ ...vitals, spo2: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>%</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Height</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="170"
                  value={vitals.height}
                  onChangeText={(text) => setVitals({ ...vitals, height: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Weight</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="70"
                  value={vitals.weight}
                  onChangeText={(text) => setVitals({ ...vitals, weight: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>Kg</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Waist</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="80"
                  value={vitals.waist}
                  onChangeText={(text) => setVitals({ ...vitals, waist: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>cm</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BSA</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="54"
                  value={vitals.bsa}
                  onChangeText={(text) => setVitals({ ...vitals, bsa: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>M</Text>
              </View>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>BMI</Text>
              <View style={styles.vitalInputContainer}>
                <TextInput
                  style={styles.vitalInput}
                  placeholder="24.2"
                  value={vitals.bmi}
                  onChangeText={(text) => setVitals({ ...vitals, bmi: text })}
                  keyboardType="numeric"
                />
                <Text style={styles.vitalUnit}>kg/cm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Previous Medical History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Medical History</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter previous medical history..."
            multiline
            numberOfLines={3}
            value={previousHistory}
            onChangeText={setPreviousHistory}
          />
        </View>

        {/* Clinical Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter clinical notes..."
            multiline
            numberOfLines={3}
            value={clinicalNotes}
            onChangeText={setClinicalNotes}
          />
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter diagnosis..."
            multiline
            numberOfLines={2}
            value={diagnosis}
            onChangeText={setDiagnosis}
          />
        </View>

        {/* Advice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advice</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter advice..."
            multiline
            numberOfLines={3}
            value={advice}
            onChangeText={setAdvice}
          />
        </View>

        {/* Follow Up */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Up</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter follow up instructions..."
            multiline
            numberOfLines={3}
            value={followUp}
            onChangeText={setFollowUp}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isActive ? (
            <Button
              title="Start Session"
              onPress={handleStartSession}
              style={styles.startButton}
            />
          ) : (
            <>
              <Button
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Save & End Appointment"
                onPress={handleEndSession}
                style={styles.endButton}
              />
            </>
          )}
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
  patientCard: {
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
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  patientDetails: {
    flex: 1,
  },
  patientId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  timerContainer: {
    alignItems: 'flex-end',
  },
  timerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  patientInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalItem: {
    width: '48%',
  },
  vitalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  vitalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  vitalInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  vitalUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  startButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  endButton: {
    flex: 1,
  },
});

