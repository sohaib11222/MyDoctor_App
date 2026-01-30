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
import { WebView } from 'react-native-webview';
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


interface ClinicMarker extends mappingApi.NearbyClinic {
  id: string;
}

const MapViewScreen = () => {
  const navigation = useNavigation<MapViewScreenNavigationProp>();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<ClinicMarker | null>(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [radius, setRadius] = useState(10); // Default 10km radius
  const [mapLoaded, setMapLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

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
    
    // Center map on marker in WebView
    if (webViewRef.current && mapLoaded) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'centerOnLocation',
        lat: clinic.coordinates.lat,
        lng: clinic.coordinates.lng
      }));
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

  // Generate HTML for Leaflet map (same as web app)
  const mapHTML = useMemo(() => {
    const center = userLocation || { lat: 40.7128, lng: -74.0060 };
    const centerLat = center.lat && !isNaN(center.lat) ? center.lat : 40.7128;
    const centerLng = center.lng && !isNaN(center.lng) ? center.lng : -74.0060;
    const zoom = userLocation ? 12 : 10;
    
    // Prepare clinics data for JavaScript
    const clinicsData = clinicMarkers.map(clinic => ({
      id: clinic.id,
      clinicName: clinic.clinicName,
      doctorName: clinic.doctorName,
      address: clinic.address,
      city: clinic.city,
      phone: clinic.phone,
      distance: clinic.distance,
      lat: clinic.coordinates.lat,
      lng: clinic.coordinates.lng,
      doctorId: clinic.doctorId,
    }));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const userLocation = ${userLocation ? JSON.stringify({ lat: centerLat, lng: centerLng }) : 'null'};
    const clinics = ${JSON.stringify(clinicsData)};
    let map;
    let markers = [];
    let userMarker = null;

    function initMap() {
      const center = userLocation || { lat: 40.7128, lng: -74.0060 };
      map = L.map('map').setView([center.lat, center.lng], ${zoom});

      // Add OpenStreetMap tiles (no API key required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add user location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'custom-user-marker',
          html: '<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('Your Location');
      }

      // Add clinic markers
      clinics.forEach(clinic => {
        if (!clinic.lat || !clinic.lng || isNaN(clinic.lat) || isNaN(clinic.lng)) return;

        const clinicIcon = L.divIcon({
          className: 'custom-clinic-marker',
          html: '<div style="background-color: #0d6efd; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">🏥</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        const marker = L.marker([clinic.lat, clinic.lng], { icon: clinicIcon })
          .addTo(map)
          .bindPopup(\`
            <div style="min-width: 200px;">
              <h6 style="margin: 0 0 5px 0; font-weight: 600;">\${clinic.clinicName || 'Clinic'}</h6>
              <p style="margin: 0; font-size: 13px; color: #666;">\${clinic.doctorName || ''}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #666;">\${clinic.address || ''}, \${clinic.city || ''}</p>
              \${clinic.distance ? '<p style="margin: 5px 0; font-size: 12px; color: #0d6efd; font-weight: 600;">' + clinic.distance.toFixed(1) + ' km away</p>' : ''}
            </div>
          \`);

        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            clinicId: clinic.id
          }));
        });

        markers.push(marker);
      });

      // Fit bounds to show all markers
      if (markers.length > 0) {
        try {
          if (markers.length === 1) {
            const position = markers[0].getLatLng();
            map.setView([position.lat, position.lng], 13);
          } else {
            const group = new L.FeatureGroup(markers);
            const bounds = group.getBounds();
            if (bounds) {
              map.fitBounds(bounds.pad(0.1));
            }
          }
        } catch (e) {
          console.error('Error fitting bounds:', e);
        }
      }

      // Notify React Native that map is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }

    // Initialize map when Leaflet loads
    if (window.L) {
      initMap();
    } else {
      window.addEventListener('load', initMap);
    }

    // Handle messages from React Native
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'updateLocation' && map) {
          const { lat, lng } = data;
          if (userMarker) {
            userMarker.setLatLng([lat, lng]);
          } else if (userLocation) {
            const userIcon = L.divIcon({
              className: 'custom-user-marker',
              html: '<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            userMarker = L.marker([lat, lng], { icon: userIcon })
              .addTo(map)
              .bindPopup('Your Location');
          }
          map.setView([lat, lng], 12);
        } else if (data.type === 'centerOnLocation' && map) {
          const { lat, lng } = data;
          map.setView([lat, lng], 14);
        } else if (data.type === 'updateClinics' && map) {
          // Clear existing markers
          markers.forEach(m => map.removeLayer(m));
          markers = [];

          // Add new clinic markers
          data.clinics.forEach(clinic => {
            if (!clinic.lat || !clinic.lng || isNaN(clinic.lat) || isNaN(clinic.lng)) return;

            const clinicIcon = L.divIcon({
              className: 'custom-clinic-marker',
              html: '<div style="background-color: #0d6efd; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">🏥</div>',
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            });

            const marker = L.marker([clinic.lat, clinic.lng], { icon: clinicIcon })
              .addTo(map)
              .bindPopup(\`
                <div style="min-width: 200px;">
                  <h6 style="margin: 0 0 5px 0; font-weight: 600;">\${clinic.clinicName || 'Clinic'}</h6>
                  <p style="margin: 0; font-size: 13px; color: #666;">\${clinic.doctorName || ''}</p>
                  <p style="margin: 5px 0; font-size: 13px; color: #666;">\${clinic.address || ''}, \${clinic.city || ''}</p>
                  \${clinic.distance ? '<p style="margin: 5px 0; font-size: 12px; color: #0d6efd; font-weight: 600;">' + clinic.distance.toFixed(1) + ' km away</p>' : ''}
                </div>
              \`);

            marker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerClick',
                clinicId: clinic.id
              }));
            });

            markers.push(marker);
          });

          // Fit bounds
          if (markers.length > 0) {
            try {
              if (markers.length === 1) {
                const position = markers[0].getLatLng();
                map.setView([position.lat, position.lng], 13);
              } else {
                const group = new L.FeatureGroup(markers);
                const bounds = group.getBounds();
                if (bounds) {
                  map.fitBounds(bounds.pad(0.1));
                }
              }
            } catch (e) {
              console.error('Error fitting bounds:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error handling message:', e);
      }
    });
  </script>
</body>
</html>
    `;
  }, [userLocation, clinicMarkers]);

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        setMapLoaded(true);
      } else if (data.type === 'markerClick') {
        const clinic = clinicMarkers.find(c => c.id === data.clinicId);
        if (clinic) {
          handleMarkerPress(clinic);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Update WebView when clinics change
  useEffect(() => {
    if (!mapLoaded || !webViewRef.current || !clinicMarkers.length) return;

    const clinicsData = clinicMarkers.map(clinic => ({
      id: clinic.id,
      clinicName: clinic.clinicName,
      doctorName: clinic.doctorName,
      address: clinic.address,
      city: clinic.city,
      phone: clinic.phone,
      distance: clinic.distance,
      lat: clinic.coordinates.lat,
      lng: clinic.coordinates.lng,
      doctorId: clinic.doctorId,
    }));

    webViewRef.current.postMessage(JSON.stringify({
      type: 'updateClinics',
      clinics: clinicsData
    }));
  }, [clinicMarkers, mapLoaded]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View - Using WebView with Leaflet (same as web app, no API key required) */}
      <View style={styles.mapContainer}>
        {userLocation ? (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
          <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
            }}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapPlaceholderText}>Getting your location...</Text>
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
              if (userLocation && webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'updateLocation',
                  lat: userLocation.lat,
                  lng: userLocation.lng
                }));
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  mapErrorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
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
