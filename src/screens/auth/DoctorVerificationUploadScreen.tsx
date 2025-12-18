import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth, User } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DoctorVerificationUploadScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

interface FileState {
  uri: string;
  name: string;
  type: string;
}

export const DoctorVerificationUploadScreen = () => {
  const navigation = useNavigation<DoctorVerificationUploadScreenNavigationProp>();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [registrationCertificate, setRegistrationCertificate] = useState<FileState | null>(null);
  const [goodStandingCertificate, setGoodStandingCertificate] = useState<FileState | null>(null);
  const [cv, setCv] = useState<FileState | null>(null);
  const [specialistRegistration, setSpecialistRegistration] = useState<FileState | null>(null);
  const [digitalSignature, setDigitalSignature] = useState<FileState | null>(null);

  const specializations = [
    'Surgery',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Neurology',
    'Oncology',
    'Psychiatry',
    'General Practice',
  ];

  const pickImage = async (setFile: (file: FileState) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload files.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].uri.split('/').pop() || 'image.jpg',
        type: result.assets[0].type || 'image/jpeg',
      });
    }
  };

  const pickDocument = async (setFile: (file: FileState) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        type: result.assets[0].mimeType || 'application/pdf',
      });
    }
  };

  const handleSubmit = async () => {
    if (!medicalCouncilNumber.trim()) {
      Alert.alert('Error', 'Medical council registration number is required');
      return;
    }
    if (!specialization) {
      Alert.alert('Error', 'Area of specialization is required');
      return;
    }
    if (!registrationCertificate) {
      Alert.alert('Error', 'Registration certificate is required');
      return;
    }
    if (!goodStandingCertificate) {
      Alert.alert('Error', 'Certificate of good standing is required');
      return;
    }
    if (!cv) {
      Alert.alert('Error', 'Curriculum Vitae is required');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Get pending registration data and log in the doctor with pending status
      const pendingData = await AsyncStorage.getItem('pending_doctor_registration');
      if (pendingData) {
        const pendingUser: User = JSON.parse(pendingData);
        const doctorUser: User = {
          ...pendingUser,
          isVerified: false,
          verificationStatus: 'pending' as const,
        };
        
        const mockToken = `mock_token_${Date.now()}`;
        const userWithToken = { ...doctorUser, token: mockToken };
        
        await AsyncStorage.multiSet([
          ['user', JSON.stringify(doctorUser)],
          ['token', mockToken],
        ]);
        
        // Set user in context to log them in (but with pending status)
        // This will keep them in AuthNavigator but logged in so they can see PendingApproval
        auth.updateUser(userWithToken);
        
        // Remove pending registration data
        await AsyncStorage.removeItem('pending_doctor_registration');
      }
      
      Alert.alert('Success', 'Verification documents uploaded successfully!');
      navigation.navigate('PendingApproval');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="medical" size={60} color={colors.primary} />
          </View>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.step,
                  step === 4 ? styles.stepActive : styles.stepDone,
                ]}
              >
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Doctor Verification</Text>
          <Text style={styles.subtitle}>
            Please provide the details below and attach copies for your verification documents.
          </Text>

          {/* Required Documents List */}
          <View style={styles.verifyBox}>
            <Text style={styles.verifyBoxTitle}>Required Documents:</Text>
            <View style={styles.verifyList}>
              <Text style={styles.verifyItem}>• Certificate of Registration with the Medical Council</Text>
              <Text style={styles.verifyItem}>• Certificate of Good Standing (valid for 3 months)</Text>
              <Text style={styles.verifyItem}>• Curriculum Vitae</Text>
              <Text style={styles.verifyItem}>• Specialist Registration Certificate (if applicable)</Text>
              <Text style={styles.verifyItem}>• Digital signature (if applicable)</Text>
            </View>
          </View>

          {/* Medical Council Registration Number */}
          <Input
            label="Medical council registration number *"
            placeholder="Enter your medical council registration number"
            value={medicalCouncilNumber}
            onChangeText={setMedicalCouncilNumber}
            style={styles.input}
          />

          {/* Specialization Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Area of Specialisation *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => {
                // TODO: Implement picker modal
                Alert.alert('Select Specialization', 'Picker will be implemented');
              }}
            >
              <Text style={specialization ? styles.pickerText : styles.pickerPlaceholder}>
                {specialization || 'Select Area of Specialisation'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Registration Certificate */}
          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>Certificate of Registration *</Text>
            <TouchableOpacity
              style={styles.fileUpload}
              onPress={() => pickImage(setRegistrationCertificate)}
            >
              <Ionicons name="document-attach" size={24} color={colors.primary} />
              <Text style={styles.fileUploadText}>
                {registrationCertificate ? 'File Selected' : 'Upload Registration Certificate'}
              </Text>
            </TouchableOpacity>
            {registrationCertificate && (
              <Text style={styles.fileName}>{registrationCertificate.name}</Text>
            )}
          </View>

          {/* Good Standing Certificate */}
          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>Certificate of Good Standing *</Text>
            <TouchableOpacity
              style={styles.fileUpload}
              onPress={() => pickImage(setGoodStandingCertificate)}
            >
              <Ionicons name="document-attach" size={24} color={colors.primary} />
              <Text style={styles.fileUploadText}>
                {goodStandingCertificate ? 'File Selected' : 'Upload Good Standing Certificate'}
              </Text>
            </TouchableOpacity>
            {goodStandingCertificate && (
              <Text style={styles.fileName}>{goodStandingCertificate.name}</Text>
            )}
          </View>

          {/* CV */}
          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>Curriculum Vitae (CV) *</Text>
            <TouchableOpacity
              style={styles.fileUpload}
              onPress={() => pickDocument(setCv)}
            >
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <Text style={styles.fileUploadText}>
                {cv ? 'File Selected' : 'Upload Curriculum Vitae'}
              </Text>
            </TouchableOpacity>
            {cv && <Text style={styles.fileName}>{cv.name}</Text>}
          </View>

          {/* Specialist Registration (Optional) */}
          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>Specialist Registration Certificate (Optional)</Text>
            <TouchableOpacity
              style={styles.fileUpload}
              onPress={() => pickImage(setSpecialistRegistration)}
            >
              <Ionicons name="document-attach" size={24} color={colors.primary} />
              <Text style={styles.fileUploadText}>
                {specialistRegistration ? 'File Selected' : 'Upload Specialist Registration'}
              </Text>
            </TouchableOpacity>
            {specialistRegistration && (
              <Text style={styles.fileName}>{specialistRegistration.name}</Text>
            )}
          </View>

          {/* Digital Signature (Optional) */}
          <View style={styles.fileUploadContainer}>
            <Text style={styles.label}>Digital Signature (Optional)</Text>
            <TouchableOpacity
              style={styles.fileUpload}
              onPress={() => pickImage(setDigitalSignature)}
            >
              <Ionicons name="document-attach" size={24} color={colors.primary} />
              <Text style={styles.fileUploadText}>
                {digitalSignature ? 'File Selected' : 'Upload Digital Signature'}
              </Text>
            </TouchableOpacity>
            {digitalSignature && (
              <Text style={styles.fileName}>{digitalSignature.name}</Text>
            )}
          </View>

          <Button
            title={loading ? 'Uploading...' : 'Submit for Verification'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Previous Step</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 12,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: colors.primary,
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.textWhite,
  },
  stepText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  verifyBox: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  verifyList: {
    gap: 8,
  },
  verifyItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: colors.textLight,
  },
  fileUploadContainer: {
    marginBottom: 16,
  },
  fileUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  fileUploadText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  fileName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

