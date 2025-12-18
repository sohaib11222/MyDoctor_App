import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MoreStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PharmacySettingsScreenNavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export const PharmacySettingsScreen = () => {
  const navigation = useNavigation<PharmacySettingsScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    websiteName: 'Medlife Medical',
    websiteLogo: null as any,
    favicon: null as any,
  });

  const pickImage = async (type: 'logo' | 'favicon') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'logo') {
          setSettings({ ...settings, websiteLogo: { uri: result.assets[0].uri } });
        } else {
          setSettings({ ...settings, favicon: { uri: result.assets[0].uri } });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = () => {
    if (!settings.websiteName.trim()) {
      Alert.alert('Required', 'Website name is required');
      return;
    }

    setLoading(true);
    // TODO: Save settings via API
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Settings saved successfully');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          {/* Website Name */}
          <Input
            label="Website Name"
            value={settings.websiteName}
            onChangeText={(text) => setSettings({ ...settings, websiteName: text })}
            placeholder="Enter website name"
          />

          {/* Website Logo */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Website Logo</Text>
            {settings.websiteLogo ? (
              <View style={styles.imagePreview}>
                <Image source={settings.websiteLogo} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSettings({ ...settings, websiteLogo: null })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('logo')}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Upload Logo</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.uploadHint}>
              Recommended image size is 150px x 150px
            </Text>
          </View>

          {/* Favicon */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Favicon</Text>
            {settings.favicon ? (
              <View style={styles.imagePreview}>
                <Image source={settings.favicon} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSettings({ ...settings, favicon: null })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('favicon')}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Upload Favicon</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.uploadHint}>
              Recommended image size is 16px x 16px or 32px x 32px
            </Text>
            <Text style={styles.uploadHint}>
              Accepted formats: only png and ico
            </Text>
          </View>

          <Button title="Save Changes" onPress={handleSave} loading={loading} style={styles.saveButton} />
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
  section: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    position: 'relative',
    alignSelf: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  saveButton: {
    marginTop: 8,
  },
});

