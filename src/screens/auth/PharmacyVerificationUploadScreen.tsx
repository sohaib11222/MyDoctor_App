import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { uploadPharmacyDocs } from '../../services/upload';

type PharmacyVerificationUploadScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

type SelectedFile = {
  uri: string;
  name: string;
  mime: string;
};

const STORAGE_KEY = 'pharmacy_documents_submitted';

const inferMimeFromName = (name: string): string => {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
};

const copyToCache = async (sourceUri: string, fileName: string, index: number): Promise<string> => {
  const safeName = (fileName || `doc-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = (FileSystem.cacheDirectory ?? '') as string;
  const dest = `${dir}pharmacy-doc-${Date.now()}-${index}-${safeName}`.replace(/\\/g, '/').replace(/\/\/+/g, '/');
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
};

export const PharmacyVerificationUploadScreen = () => {
  const navigation = useNavigation<PharmacyVerificationUploadScreenNavigationProp>();
  const [licenseFile, setLicenseFile] = useState<SelectedFile | null>(null);
  const [degreeFile, setDegreeFile] = useState<SelectedFile | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !!licenseFile && !!degreeFile, [licenseFile, degreeFile]);

  const pickFile = async (kind: 'license' | 'degree') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const name = asset.name || `document-${Date.now()}.pdf`;
      const mime = asset.mimeType || inferMimeFromName(name);

      const fileUri = await copyToCache(asset.uri, name, kind === 'license' ? 0 : 1);

      const file: SelectedFile = {
        uri: fileUri,
        name,
        mime,
      };

      if (kind === 'license') setLicenseFile(file);
      else setDegreeFile(file);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to pick document');
    }
  };

  const onSubmit = async () => {
    if (!canSubmit || !licenseFile || !degreeFile) {
      Toast.show({
        type: 'error',
        text1: 'Missing Documents',
        text2: 'Please upload both license and degree documents.',
      });
      return;
    }

    setLoading(true);
    try {
      await uploadPharmacyDocs([licenseFile], 'PHARMACY_LICENSE');
      await uploadPharmacyDocs([degreeFile], 'PHARMACY_DEGREE');

      await AsyncStorage.setItem(STORAGE_KEY, 'true');

      Toast.show({
        type: 'success',
        text1: 'Documents Uploaded',
        text2: 'Your verification documents have been submitted for review.',
      });

      navigation.replace('PendingApproval');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Upload failed';
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={54} color={colors.primary} />
          <Text style={styles.title}>Pharmacy Verification</Text>
          <Text style={styles.subtitle}>Upload required documents to get approved</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Required Documents</Text>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemTitle}>Pharmacy License</Text>
              <Text style={styles.itemDesc}>{licenseFile ? licenseFile.name : 'PDF or Image'}</Text>
            </View>
            <TouchableOpacity style={styles.pickBtn} onPress={() => pickFile('license')} activeOpacity={0.7}>
              <Ionicons name={licenseFile ? 'refresh' : 'cloud-upload-outline'} size={18} color={colors.textWhite} />
              <Text style={styles.pickBtnText}>{licenseFile ? 'Replace' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemTitle}>Pharmacy Degree</Text>
              <Text style={styles.itemDesc}>{degreeFile ? degreeFile.name : 'PDF or Image'}</Text>
            </View>
            <TouchableOpacity style={styles.pickBtn} onPress={() => pickFile('degree')} activeOpacity={0.7}>
              <Ionicons name={degreeFile ? 'refresh' : 'cloud-upload-outline'} size={18} color={colors.textWhite} />
              <Text style={styles.pickBtnText}>{degreeFile ? 'Replace' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>

          <Button title="Submit for Approval" onPress={onSubmit} loading={loading} disabled={!canSubmit || loading} style={styles.submitBtn} />

          <Text style={styles.note}>
            Note: Your account will be reviewed by admin. After approval, you can login and add products.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 18, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 10 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.backgroundLight, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLeft: { flex: 1, paddingRight: 12 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  pickBtnText: { color: colors.textWhite, marginLeft: 6, fontWeight: '700', fontSize: 12 },
  submitBtn: { marginTop: 6 },
  note: { fontSize: 12, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
});
