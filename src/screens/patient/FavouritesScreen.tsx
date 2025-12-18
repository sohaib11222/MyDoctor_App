import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MoreStackParamList, TabParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type FavouritesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

interface Favourite {
  id: string;
  name: string;
  img: any;
  speciality: string;
  rating: number;
  reviews: string;
  nextAvail: string;
  location: string;
  lastBook: string;
}

const favourites: Favourite[] = [
  {
    id: '1',
    name: 'Dr.Edalin Hendry',
    img: require('../../../assets/avatar.png'),
    speciality: 'MD - Cardiology',
    rating: 5.0,
    reviews: '',
    nextAvail: '23 Mar 2024',
    location: 'Newyork, USA',
    lastBook: '21 Jan 2023',
  },
  {
    id: '2',
    name: 'Dr.Shanta Nesmith',
    img: require('../../../assets/avatar.png'),
    speciality: 'DO - Oncology',
    rating: 4.0,
    reviews: '(35)',
    nextAvail: '27 Mar 2024',
    location: 'Los Angeles, USA',
    lastBook: '18 Jan 2023',
  },
  {
    id: '3',
    name: 'Dr.John Ewel',
    img: require('../../../assets/avatar.png'),
    speciality: 'MD - Orthopedics',
    rating: 5.0,
    reviews: '',
    nextAvail: '02 Apr 2024',
    location: 'Dallas, USA',
    lastBook: '28 Jan 2023',
  },
  {
    id: '4',
    name: 'Dr.Susan Fenimore',
    img: require('../../../assets/avatar.png'),
    speciality: 'DO - Dermatology',
    rating: 4.0,
    reviews: '',
    nextAvail: '11 Apr 2024',
    location: 'Chicago, USA',
    lastBook: '08 Feb 2023',
  },
];

export const FavouritesScreen = () => {
  const navigation = useNavigation<FavouritesScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFavourites = favourites.filter((fav) =>
    fav.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fav.speciality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? colors.warning : colors.textLight}
        />
      );
    }
    return stars;
  };

  const handleBookAppointment = (doctorId: string) => {
    (navigation as any).navigate('Home', { screen: 'Booking', params: { doctorId } });
  };

  const handleViewProfile = (doctorId: string) => {
    (navigation as any).navigate('Home', { screen: 'DoctorProfile', params: { doctorId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search favourites..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Favourites List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredFavourites.map((favourite) => (
          <View key={favourite.id} style={styles.favouriteCard}>
            <TouchableOpacity
              style={styles.favouriteButton}
              onPress={() => {}}
            >
              <Ionicons name="heart" size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doctorInfo}
              onPress={() => handleViewProfile(favourite.id)}
            >
              <Image source={favourite.img} style={styles.doctorImage} />
              <View style={styles.doctorDetails}>
                <View style={styles.doctorNameRow}>
                  <Text style={styles.doctorName}>{favourite.name}</Text>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                </View>
                <Text style={styles.speciality}>{favourite.speciality}</Text>
                <View style={styles.ratingRow}>
                  <View style={styles.stars}>{renderStars(favourite.rating)}</View>
                  <Text style={styles.ratingText}>
                    {favourite.rating}{favourite.reviews}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Next Availability: {favourite.nextAvail}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{favourite.location}</Text>
                </View>
                <Text style={styles.lastBook}>Last Book on {favourite.lastBook}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => handleBookAppointment(favourite.id)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  favouriteCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  favouriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  doctorDetails: {
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
    marginRight: 6,
  },
  speciality: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  lastBook: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
  bookButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

