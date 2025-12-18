import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';

type PharmacyRegisterStep2ScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const cities = ['Select Your City', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
const states = ['Select Your State', 'New York', 'California', 'Illinois', 'Texas', 'Arizona'];

export const PharmacyRegisterStep2Screen = () => {
  const navigation = useNavigation<PharmacyRegisterStep2ScreenNavigationProp>();
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [selectedState, setSelectedState] = useState(states[0]);
  const [cityMenuVisible, setCityMenuVisible] = useState(false);
  const [stateMenuVisible, setStateMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (selectedCity === cities[0] || selectedState === states[0]) {
      Alert.alert('Required', 'Please select both city and state to continue.');
      return;
    }
    navigation.navigate('PharmacyRegisterStep3');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Ionicons name="medical" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepCompleted]}>
            <Ionicons name="checkmark" size={20} color={colors.textWhite} />
          </View>
          <View style={styles.stepLineCompleted} />
          <View style={[styles.step, styles.stepActive]}>
            <Text style={styles.stepTextActive}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <Text style={styles.stepText}>3</Text>
          </View>
        </View>

        {/* Location Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <Text style={styles.sectionSubtitle}>Select your pharmacy location</Text>

          <View style={styles.form}>
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Select City</Text>
              <Menu
                visible={cityMenuVisible}
                onDismiss={() => setCityMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() => setCityMenuVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, selectedCity === cities[0] && styles.pickerPlaceholder]}>
                      {selectedCity}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                }
              >
                {cities.slice(1).map((city, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setSelectedCity(city);
                      setCityMenuVisible(false);
                    }}
                    title={city}
                  />
                ))}
              </Menu>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Select State</Text>
              <Menu
                visible={stateMenuVisible}
                onDismiss={() => setStateMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() => setStateMenuVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, selectedState === states[0] && styles.pickerPlaceholder]}>
                      {selectedState}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                }
              >
                {states.slice(1).map((state, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setSelectedState(state);
                      setStateMenuVisible(false);
                    }}
                    title={state}
                  />
                ))}
              </Menu>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={selectedCity === cities[0] || selectedState === states[0]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    width: 40,
    height: 2,
    backgroundColor: colors.success,
    marginHorizontal: 8,
  },
  formContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    gap: 24,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textLight,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

