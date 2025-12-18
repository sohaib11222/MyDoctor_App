import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppointmentsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type BookingScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'Booking'>;
type BookingRouteProp = RouteProp<AppointmentsStackParamList, 'Booking'>;

const BookingScreen = () => {
  const navigation = useNavigation<BookingScreenNavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { doctorId } = route.params;
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiology');
  const [selectedServices, setSelectedServices] = useState<string[]>(['service1']);

  const steps = [
    { id: 1, label: 'Specialty' },
    { id: 2, label: 'Appointment Type' },
    { id: 3, label: 'Date & Time' },
    { id: 4, label: 'Basic Information' },
    { id: 5, label: 'Payment' },
    { id: 6, label: 'Confirmation' },
  ];

  const services = [
    { id: 'service1', title: 'Echocardiograms', price: '$310', checked: true },
    { id: 'service2', title: 'Stress tests', price: '$754' },
    { id: 'service3', title: 'Stress tests', price: '$754' },
    { id: 'service4', title: 'Heart Catheterization', price: '$150' },
    { id: 'service5', title: 'Echocardiograms', price: '$200' },
    { id: 'service6', title: 'Echocardiograms', price: '$200' },
  ];

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      if (currentStep === steps.length - 1) {
        navigation.navigate('Checkout');
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Doctor Info Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorHeader}>
            <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.doctorImage} />
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>Dr. Michael Brown</Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FFB800" />
                  <Text style={styles.ratingText}>5.0</Text>
                </View>
              </View>
              <Text style={styles.specialty}>Psychologist</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.locationText}>
                  5th Street - 1011 W 5th St, Suite 120, Austin, TX 78703
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Step 1: Select Specialty */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Select Speciality</Text>
              <View style={styles.specialtyContainer}>
                {['Cardiology', 'Neurology', 'Urology'].map((specialty) => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.specialtyOption,
                      selectedSpecialty === specialty && styles.specialtyOptionActive,
                    ]}
                    onPress={() => setSelectedSpecialty(specialty)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.specialtyText,
                        selectedSpecialty === specialty && styles.specialtyTextActive,
                      ]}
                    >
                      {specialty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Services</Text>
              <View style={styles.servicesGrid}>
                {services.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceCard,
                        isSelected && styles.serviceCardActive,
                      ]}
                      onPress={() => toggleService(service.id)}
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
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <Text style={styles.servicePrice}>{service.price}</Text>
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Step 2-6: Placeholder content */}
        {currentStep > 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep - 1].label}</Text>
            <Text style={styles.stepDescription}>Content for {steps[currentStep - 1].label} step</Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {currentStep === steps.length - 1 ? 'Go to Payment' : `Next: ${steps[currentStep]?.label}`}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textWhite} />
          </TouchableOpacity>
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
});

export default BookingScreen;

