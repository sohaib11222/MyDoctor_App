import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import * as appointmentApi from '../../services/appointment';
import * as prescriptionApi from '../../services/prescription';

type RouteParams = { appointmentId: string };

const emptyMedication = (): prescriptionApi.PrescriptionMedication => ({
  name: '',
  strength: '',
  form: '',
  route: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: '',
  refills: 0,
  instructions: '',
  substitutionAllowed: true,
  isPrn: false,
});

export const PrescriptionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isDoctor = user?.role === 'doctor';
  const appointmentId: string | undefined = (route.params as RouteParams | undefined)?.appointmentId;

  const { data: appointmentResponse, isLoading: appointmentLoading, error: appointmentError } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.getAppointmentById(appointmentId as string),
    enabled: !!appointmentId,
    retry: 1,
  });

  const appointment = appointmentResponse?.data || null;

  const {
    data: prescriptionResponse,
    isLoading: prescriptionLoading,
    error: prescriptionError,
  } = useQuery({
    queryKey: ['prescriptionByAppointment', appointmentId],
    queryFn: async () => {
      try {
        const res = await prescriptionApi.getPrescriptionByAppointment(appointmentId as string);
        return res;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!appointmentId && !!appointment && appointment.status === 'COMPLETED',
    retry: false,
  });

  const prescription: prescriptionApi.Prescription | null = prescriptionResponse?.data || null;

  const [form, setForm] = useState({
    diagnosis: '',
    clinicalNotes: '',
    allergies: '',
    advice: '',
    followUp: '',
    testsText: '',
    medications: [emptyMedication()],
    status: 'ISSUED' as 'DRAFT' | 'ISSUED',
  });

  useEffect(() => {
    if (!prescription) return;

    setForm({
      diagnosis: prescription.diagnosis || '',
      clinicalNotes: prescription.clinicalNotes || '',
      allergies: prescription.allergies || '',
      advice: prescription.advice || '',
      followUp: prescription.followUp || '',
      testsText: Array.isArray(prescription.tests) ? prescription.tests.join('\n') : '',
      medications:
        Array.isArray(prescription.medications) && prescription.medications.length > 0
          ? prescription.medications.map((m) => ({
              name: m.name || '',
              strength: m.strength || '',
              form: m.form || '',
              route: m.route || '',
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
              quantity: m.quantity || '',
              refills: typeof m.refills === 'number' ? m.refills : 0,
              instructions: m.instructions || '',
              substitutionAllowed: m.substitutionAllowed !== false,
              isPrn: m.isPrn === true,
            }))
          : [emptyMedication()],
      status: prescription.status || 'ISSUED',
    });
  }, [prescription?._id]);

  const canEdit = useMemo(() => {
    return isDoctor && appointment?.status === 'COMPLETED';
  }, [isDoctor, appointment?.status]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const tests = form.testsText
        ? form.testsText
            .split('\n')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const medications = (form.medications || [])
        .map((m) => ({
          name: (m.name || '').trim(),
          strength: m.strength?.trim() || null,
          form: m.form?.trim() || null,
          route: m.route?.trim() || null,
          dosage: m.dosage?.trim() || null,
          frequency: m.frequency?.trim() || null,
          duration: m.duration?.trim() || null,
          quantity: m.quantity?.trim() || null,
          refills: Number.isFinite(Number(m.refills)) ? Number(m.refills) : 0,
          instructions: m.instructions?.trim() || null,
          substitutionAllowed: m.substitutionAllowed !== false,
          isPrn: m.isPrn === true,
        }))
        .filter((m) => m.name);

      return prescriptionApi.upsertPrescriptionForAppointment(appointmentId as string, {
        diagnosis: form.diagnosis || null,
        clinicalNotes: form.clinicalNotes || null,
        allergies: form.allergies || null,
        advice: form.advice || null,
        followUp: form.followUp || null,
        tests,
        medications,
        status: form.status,
      });
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['prescriptionByAppointment', appointmentId], res);
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('more.prescription.toasts.savedSuccessfully'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || t('more.prescription.errors.failedToSave');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  const updateMedication = (index: number, key: keyof prescriptionApi.PrescriptionMedication, value: any) => {
    setForm((prev) => {
      const meds = [...(prev.medications || [])];
      meds[index] = { ...meds[index], [key]: value };
      return { ...prev, medications: meds };
    });
  };

  const addMedication = () => {
    setForm((prev) => ({ ...prev, medications: [...(prev.medications || []), emptyMedication()] }));
  };

  const removeMedication = (index: number) => {
    setForm((prev) => {
      const meds = [...(prev.medications || [])];
      meds.splice(index, 1);
      return { ...prev, medications: meds.length > 0 ? meds : [emptyMedication()] };
    });
  };

  const handleDownload = async () => {
    if (!prescription?._id) {
      Alert.alert(t('more.prescription.alerts.notAvailableTitle'), t('more.prescription.alerts.notAvailableBody'));
      return;
    }

    try {
      const result = await prescriptionApi.downloadPrescriptionPdf(prescription._id);

      if (Platform.OS === 'android') {
        // Expo FileSystem returns a file:// URI. Android requires a content:// URI to avoid FileUriExposedException.
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        const grantReadFlag =
          (IntentLauncher as any)?.AndroidFlags?.FLAG_GRANT_READ_URI_PERMISSION ??
          (IntentLauncher as any)?.Flags?.GRANT_READ_URI_PERMISSION ??
          1;
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: grantReadFlag,
          type: 'application/pdf',
        });
        return;
      }

      const canOpen = await Linking.canOpenURL(result.uri);
      if (canOpen) {
        await Linking.openURL(result.uri);
      } else {
        Alert.alert(t('more.prescription.alerts.downloadedTitle'), t('more.prescription.alerts.savedTo', { uri: result.uri }));
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || t('more.prescription.errors.failedToDownload');
      Alert.alert(t('more.prescription.alerts.downloadFailedTitle'), errorMessage);
    }
  };

  if (!appointmentId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('more.prescription.errors.appointmentIdRequired')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (appointmentLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.prescription.loadingAppointment')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (appointmentError || !appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('more.prescription.errors.failedToLoadAppointment')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (appointment.status !== 'COMPLETED') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.prescription')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.infoText}>{t('more.prescription.completedOnly')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const appointmentNumber = appointment.appointmentNumber || `#${appointment._id.slice(-6)}`;
  const doctorName = appointment.doctorId?.fullName || t('common.doctor');
  const patientName = appointment.patientId?.fullName || t('common.patient');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.prescription')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('more.prescription.appointmentTitle', { number: appointmentNumber })}</Text>
          <Text style={styles.subTitle}>{t('more.prescription.doctorLine', { name: doctorName })}</Text>
          <Text style={styles.subTitle}>{t('more.prescription.patientLine', { name: patientName })}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color={colors.text} />
              <Text style={styles.actionBtnText}>{t('more.prescription.actions.downloadPdf')}</Text>
            </TouchableOpacity>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => upsertMutation.mutate()}
                disabled={upsertMutation.isPending}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, styles.primaryBtnText]}>
                  {upsertMutation.isPending ? t('common.saving') : t('more.prescription.actions.save')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {prescriptionLoading && (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('more.prescription.loadingPrescription')}</Text>
            </View>
          )}

          {!prescriptionLoading && !prescription && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isDoctor ? t('more.prescription.noPrescription.doctor') : t('more.prescription.noPrescription.patient')}
              </Text>
            </View>
          )}

          {!!prescriptionError && (
            <View style={styles.infoBox}>
              <Text style={styles.errorText}>{t('more.prescription.errors.failedToLoadPrescription')}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('more.prescription.sections.clinicalInformation')}</Text>

          <Text style={styles.label}>{t('more.prescription.labels.diagnosis')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.diagnosis}
            onChangeText={(t) => setForm((p) => ({ ...p, diagnosis: t }))}
            editable={canEdit}
            multiline
          />

          <Text style={styles.label}>{t('more.prescription.labels.allergies')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.allergies}
            onChangeText={(t) => setForm((p) => ({ ...p, allergies: t }))}
            editable={canEdit}
            multiline
          />

          <Text style={styles.label}>{t('more.prescription.labels.clinicalNotes')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.clinicalNotes}
            onChangeText={(t) => setForm((p) => ({ ...p, clinicalNotes: t }))}
            editable={canEdit}
            multiline
          />

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('more.prescription.sections.medications')}</Text>
            {canEdit && (
              <TouchableOpacity onPress={addMedication} style={styles.smallBtn} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.smallBtnText}>{t('common.add')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {(form.medications || []).map((m, idx) => (
            <View key={idx} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medTitle}>{t('more.prescription.medicationTitle', { number: idx + 1 })}</Text>
                {canEdit && (
                  <TouchableOpacity onPress={() => removeMedication(idx)} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>{t('more.prescription.labels.name')}</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.disabledInput]}
                value={m.name}
                onChangeText={(t) => updateMedication(idx, 'name', t)}
                editable={canEdit}
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.strength')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.strength as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'strength', t)}
                    editable={canEdit}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.form')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.form as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'form', t)}
                    editable={canEdit}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.dosage')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.dosage as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'dosage', t)}
                    editable={canEdit}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.frequency')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.frequency as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'frequency', t)}
                    editable={canEdit}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.duration')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.duration as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'duration', t)}
                    editable={canEdit}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('more.prescription.labels.quantity')}</Text>
                  <TextInput
                    style={[styles.input, !canEdit && styles.disabledInput]}
                    value={(m.quantity as any) || ''}
                    onChangeText={(t) => updateMedication(idx, 'quantity', t)}
                    editable={canEdit}
                  />
                </View>
              </View>

              <Text style={styles.label}>{t('more.prescription.labels.instructions')}</Text>
              <TextInput
                style={[styles.textArea, !canEdit && styles.disabledInput]}
                value={(m.instructions as any) || ''}
                onChangeText={(t) => updateMedication(idx, 'instructions', t)}
                editable={canEdit}
                multiline
              />
            </View>
          ))}

          <Text style={styles.sectionTitle}>{t('more.prescription.sections.recommendedTests')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.testsText}
            onChangeText={(t) => setForm((p) => ({ ...p, testsText: t }))}
            editable={canEdit}
            multiline
          />

          <Text style={styles.sectionTitle}>{t('more.prescription.sections.followUp')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.followUp}
            onChangeText={(t) => setForm((p) => ({ ...p, followUp: t }))}
            editable={canEdit}
            multiline
          />

          <Text style={styles.sectionTitle}>{t('more.prescription.sections.advice')}</Text>
          <TextInput
            style={[styles.textArea, !canEdit && styles.disabledInput]}
            value={form.advice}
            onChangeText={(t) => setForm((p) => ({ ...p, advice: t }))}
            editable={canEdit}
            multiline
          />

          {canEdit && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>{t('more.prescription.labels.status')}</Text>
              <View style={styles.statusButtons}>
                {(['ISSUED', 'DRAFT'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusBtn, form.status === st && styles.statusBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, status: st }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.statusBtnText, form.status === st && styles.statusBtnTextActive]}>
                      {st === 'ISSUED' ? t('more.prescription.status.issued') : t('more.prescription.status.draft')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryBtnText: {
    color: colors.textWhite,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: colors.backgroundLight,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  smallBtnText: {
    color: colors.primary,
    fontWeight: '700',
  },
  medCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  medTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statusRow: {
    marginTop: 14,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  statusBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  statusBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  statusBtnTextActive: {
    color: colors.primary,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: colors.error,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  infoText: {
    color: colors.text,
    fontWeight: '600',
  },
});
