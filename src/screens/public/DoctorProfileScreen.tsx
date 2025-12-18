import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type DoctorProfileScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'DoctorProfile'>;
type DoctorProfileRouteProp = RouteProp<HomeStackParamList, 'DoctorProfile'>;

const DoctorProfileScreen = () => {
  const navigation = useNavigation<DoctorProfileScreenNavigationProp>();
  const route = useRoute<DoctorProfileRouteProp>();
  const { doctorId } = route.params;
  const [activeTab, setActiveTab] = useState('bio');

  const tabs = [
    { id: 'bio', label: 'Bio' },
    { id: 'experience', label: 'Experience' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'services', label: 'Services' },
    { id: 'speciality', label: 'Speciality' },
    { id: 'availability', label: 'Availability' },
    { id: 'clinic', label: 'Clinics' },
    { id: 'review', label: 'Reviews' },
  ];

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < Math.floor(rating)) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFB800" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFB800" />);
      }
    }
    return stars;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'bio':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Doctor Bio</Text>
            <Text style={styles.tabText}>
              "Highly motivated and experienced doctor with a passion for providing excellent care to patients. 
              Experienced in a wide variety of medical settings, with particular expertise in diagnostics, 
              primary care and emergency medicine. Skilled in using the latest technology to streamline patient care. 
              Committed to delivering compassionate, personalized care to each and every patient."
            </Text>
            <TouchableOpacity style={styles.showMoreBtn} activeOpacity={0.7}>
              <Text style={styles.showMoreText}>See More</Text>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>{tabs.find(t => t.id === activeTab)?.label}</Text>
            <Text style={styles.tabText}>Content coming soon...</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Doctor Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.doctorImage}
            />
            <View style={styles.profileInfo}>
              <View style={styles.availabilityBadge}>
                <View style={styles.availabilityDot} />
                <Text style={styles.availabilityText}>Available</Text>
              </View>
              <Text style={styles.doctorName}>
                Dr. Martin Adian
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.verifiedIcon} />
              </Text>
              <View style={styles.specialtyBadge}>
                <View style={styles.specialtyDot} />
                <Text style={styles.specialtyText}>Dentist</Text>
              </View>
              <Text style={styles.qualification}>BDS, MDS - Oral & Maxillofacial Surgery</Text>
              <Text style={styles.languages}>Speaks : English, French, German</Text>
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.addressText}>
                  No 14, 15th Cross, Old Trafford, UK
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.viewLocationText}>( View Location )</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.activitiesContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>Full Time, Online Therapy Available</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="thumbs-up-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>
                  <Text style={styles.boldText}>94%</Text> Recommended
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Ionicons name="business-outline" size={18} color={colors.primary} />
                <Text style={styles.activityText}>Royal Prince Alfred Hospital</Text>
              </View>
              <View style={styles.acceptingBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.acceptingText}>Accepting New Patients</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.ratingContainer}>
                {renderStars(5.0)}
                <Text style={styles.ratingText}>5.0</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.reviewsLink}>150 Reviews</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactButtons}>
                <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.textWhite} />
                  <Text style={styles.contactBtnText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contactBtn, styles.audioBtn]} activeOpacity={0.8}>
                  <Ionicons name="call-outline" size={16} color={colors.textWhite} />
                  <Text style={styles.contactBtnText}>Audio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contactBtn, styles.videoBtn]} activeOpacity={0.8}>
                  <Ionicons name="videocam-outline" size={16} color={colors.textWhite} />
                  <Text style={styles.contactBtnText}>Video</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>200+ Appointments</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.text }]}>
                <Ionicons name="target-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>21 Years</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="star-outline" size={18} color={colors.textWhite} />
              </View>
              <Text style={styles.statText}>15+ Awards</Text>
            </View>
          </View>

          <View style={styles.bookingContainer}>
            <Text style={styles.priceText}>
              Price : <Text style={styles.priceAmount}>$100 - $200</Text> for a Session
            </Text>
            <TouchableOpacity
              style={styles.bookAppointmentBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Booking', { doctorId: doctorId || '1' })}
            >
              <Text style={styles.bookAppointmentText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  specialtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  specialtyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  qualification: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  languages: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  viewLocationText: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  activitiesContainer: {
    marginBottom: 20,
  },
  activityItem: {
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityText: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  acceptingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  acceptingText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  reviewsLink: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 8,
  },
  contactButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  audioBtn: {
    backgroundColor: '#8B5CF6',
  },
  videoBtn: {
    backgroundColor: '#6366F1',
  },
  contactBtnText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statText: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  bookingContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  priceAmount: {
    fontWeight: '600',
    color: colors.text,
  },
  bookAppointmentBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookAppointmentText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: colors.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
});

export default DoctorProfileScreen;
