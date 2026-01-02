import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as mappingApi from '../../services/mapping';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';

type MapViewScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'MapView'>;

const { width, height } = Dimensions.get('window');

// OpenStreetMap tile server URL
const OPENSTREETMAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

interface ClinicMarker extends mappingApi.NearbyClinic {
  id: string;
}

const MapViewScreen = () => {
  const navigation = useNavigation<MapViewScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<ClinicMarker | null>(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [radius, setRadius] = useState(10); // Default 10km radius

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setLocationPermission(false);
          Toast.show({
            type: 'error',
            text1: 'Location Permission Denied',
            text2: 'Please enable location services to see nearby clinics',
          });
          // Set a default location (you can change this to your app's default location)
          setUserLocation({ lat: 40.7128, lng: -74.0060 }); // New York default
          return;
        }

        setLocationPermission(true);
        
        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };

        setUserLocation(coords);

        // Center map on user location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        Toast.show({
          type: 'error',
          text1: 'Location Error',
          text2: 'Could not get your location. Using default location.',
        });
        // Set default location
        setUserLocation({ lat: 40.7128, lng: -74.0060 });
      }
    })();
  }, []);

  // Fetch nearby clinics
  const {
    data: nearbyClinics,
    isLoading: isLoadingClinics,
    error: clinicsError,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ['nearby-clinics', userLocation?.lat, userLocation?.lng, radius],
    queryFn: async () => {
      if (!userLocation) return [];
      return await mappingApi.getNearbyClinics({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius,
      });
    },
    enabled: !!userLocation,
    retry: 1,
  });

  // Convert clinics to markers with unique IDs
  const clinicMarkers = useMemo(() => {
    if (!nearbyClinics) return [];
    return nearbyClinics.map((clinic) => ({
      ...clinic,
      id: clinic.clinicId,
    }));
  }, [nearbyClinics]);

  // Handle marker press
  const handleMarkerPress = (clinic: ClinicMarker) => {
    setSelectedClinic(clinic);
    setShowClinicModal(true);
    
    // Animate map to marker
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: clinic.coordinates.lat,
        longitude: clinic.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  };

  // Handle view doctor profile
  const handleViewDoctor = (clinic: ClinicMarker) => {
    setShowClinicModal(false);
    navigation.navigate('DoctorProfile', { doctorId: clinic.doctorId });
  };

  // Handle book appointment
  const handleBookAppointment = (clinic: ClinicMarker) => {
    setShowClinicModal(false);
    navigation.navigate('Booking', { doctorId: clinic.doctorId });
  };

  // Handle refresh location
  const handleRefreshLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 1000);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Location Updated',
        text2: 'Nearby clinics refreshed',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not update location',
      });
    }
  };

  // Initial region for map
  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 40.7128,
        longitude: -74.0060,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {userLocation ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            toolbarEnabled={false}
            // For OpenStreetMap, we can use custom map style or default
            // Note: react-native-maps uses Google Maps by default on Android
            // For true OpenStreetMap, you'd need to use a library like react-native-mapbox-gl
            // But we'll use the default provider which works well
          >
            {/* User location marker is handled by showsUserLocation */}
            
            {/* Clinic markers */}
            {clinicMarkers.map((clinic) => (
              <Marker
                key={clinic.id}
                coordinate={{
                  latitude: clinic.coordinates.lat,
                  longitude: clinic.coordinates.lng,
                }}
                title={clinic.clinicName}
                description={`${clinic.distance.toFixed(1)} km away`}
                onPress={() => handleMarkerPress(clinic)}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerPin}>
                    <Ionicons name="medical" size={20} color={colors.textWhite} />
                  </View>
                  <View style={styles.markerDot} />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleRefreshLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (userLocation && mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }, 1000);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Radius Selector */}
        <View style={styles.radiusSelector}>
          <Text style={styles.radiusLabel}>Radius: {radius} km</Text>
          <View style={styles.radiusButtons}>
            {[5, 10, 15, 20, 25].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusButton, radius === r && styles.radiusButtonActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.radiusButtonText, radius === r && styles.radiusButtonTextActive]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Loading Overlay */}
        {isLoadingClinics && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Finding nearby clinics...</Text>
          </View>
        )}

        {/* Error Message */}
        {clinicsError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <Text style={styles.errorText}>Failed to load clinics</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetchClinics()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Clinics List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            <Text style={styles.listCount}>{clinicMarkers.length}</Text> Nearby Clinics
          </Text>
          {!locationPermission && (
            <View style={styles.permissionWarning}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={styles.permissionText}>Location disabled</Text>
            </View>
          )}
        </View>

        {isLoadingClinics ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading clinics...</Text>
          </View>
        ) : clinicMarkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No clinics found nearby</Text>
            <Text style={styles.emptySubtext}>Try increasing the search radius</Text>
          </View>
        ) : (
          <FlatList
            data={clinicMarkers}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clinicItem}
                onPress={() => handleMarkerPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName} numberOfLines={1}>
                    {item.clinicName}
                  </Text>
                  <Text style={styles.doctorName} numberOfLines={1}>
                    {item.doctorName}
                  </Text>
                  <View style={styles.clinicDetails}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.clinicAddress} numberOfLines={1}>
                      {item.address}, {item.city}
                    </Text>
                  </View>
                  <View style={styles.distanceContainer}>
                    <Ionicons name="walk-outline" size={14} color={colors.primary} />
                    <Text style={styles.distanceText}>{item.distance.toFixed(1)} km away</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleMarkerPress(item)}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Clinic Details Modal */}
      <Modal
        visible={showClinicModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClinicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedClinic && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedClinic.clinicName}</Text>
                  <TouchableOpacity
                    onPress={() => setShowClinicModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Doctor</Text>
                    <Text style={styles.modalText}>{selectedClinic.doctorName}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Address</Text>
                    <Text style={styles.modalText}>
                      {selectedClinic.address}, {selectedClinic.city}
                    </Text>
                  </View>

                  {selectedClinic.phone && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Phone</Text>
                      <Text style={styles.modalText}>{selectedClinic.phone}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Distance</Text>
                    <Text style={styles.modalText}>{selectedClinic.distance.toFixed(1)} km away</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.viewButton]}
                    onPress={() => handleViewDoctor(selectedClinic)}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                    <Text style={[styles.modalButtonText, styles.viewButtonText]}>View Doctor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.bookButton]}
                    onPress={() => handleBookAppointment(selectedClinic)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.textWhite} />
                    <Text style={[styles.modalButtonText, styles.bookButtonText]}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  mapContainer: {
    height: height * 0.5,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  controlButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusSelector: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  radiusButtonTextActive: {
    color: colors.textWhite,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  retryButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
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
    color: colors.primary,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  permissionText: {
    fontSize: 12,
    color: colors.warning,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clinicItem: {
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
    alignItems: 'center',
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  clinicDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clinicAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  viewButton: {
    padding: 8,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginTop: -4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalText: {
    fontSize: 15,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButtonText: {
    color: colors.primary,
  },
  bookButton: {
    backgroundColor: colors.primary,
  },
  bookButtonText: {
    color: colors.textWhite,
  },
});

export default MapViewScreen;
