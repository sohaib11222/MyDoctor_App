import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type MapViewScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'MapView'>;

const { width, height } = Dimensions.get('window');

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  fee: number;
  available: boolean;
  image: string;
  latitude: number;
  longitude: number;
}

const MapViewScreen = () => {
  const navigation = useNavigation<MapViewScreenNavigationProp>();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const doctors: Doctor[] = [
    { id: 1, name: 'Dr. Michael Brown', specialty: 'Psychologist', rating: 5.0, location: 'Minneapolis, MN', fee: 650, available: true, image: 'https://via.placeholder.com/150', latitude: 37.78825, longitude: -122.4324 },
    { id: 2, name: 'Dr. Nicholas Tello', specialty: 'Pediatrician', rating: 4.6, location: 'Ogden, IA', fee: 400, available: true, image: 'https://via.placeholder.com/150', latitude: 37.78925, longitude: -122.4334 },
    { id: 3, name: 'Dr. Harold Bryant', specialty: 'Neurologist', rating: 4.8, location: 'Winona, MS', fee: 500, available: true, image: 'https://via.placeholder.com/150', latitude: 37.79025, longitude: -122.4344 },
  ];

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={12} color="#FFB800" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color="#FFB800" />);
      }
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const renderDoctorItem = ({ item }: { item: Doctor }) => (
    <TouchableOpacity
      style={styles.doctorItem}
      onPress={() => {
        setSelectedDoctor(item);
        navigation.navigate('DoctorProfile', { doctorId: item.id.toString() });
      }}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.doctorThumbnail} />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.doctorSpecialty} numberOfLines={1}>{item.specialty}</Text>
        <View style={styles.ratingContainer}>
          {renderStars(item.rating)}
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
        <Text style={styles.feeText}>${item.fee}</Text>
      </View>
      <View style={styles.doctorActions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('DoctorProfile', { doctorId: item.id.toString() })}
          activeOpacity={0.7}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.mapPlaceholderText}>Map View</Text>
          <Text style={styles.mapPlaceholderSubtext}>Interactive map will be displayed here</Text>
        </View>
      </View>

      {/* Doctors List Section */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            <Text style={styles.listCount}>450</Text> Doctors
          </Text>
          <View style={styles.viewControls}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('DoctorGrid')}
              activeOpacity={0.7}
            >
              <Ionicons name="grid" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewBtn, styles.viewBtnActive]} activeOpacity={0.7}>
              <Ionicons name="map" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={doctors}
          renderItem={renderDoctorItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  mapContainer: {
    height: height * 0.4,
    backgroundColor: colors.backgroundLight,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listCount: {
    color: colors.textSecondary,
  },
  viewControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBtn: {
    padding: 8,
    marginLeft: 4,
  },
  viewBtnActive: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  doctorItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  feeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  doctorActions: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  viewBtnText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  bookBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bookBtnText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapViewScreen;
