import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as pharmacyApi from '../../services/pharmacy';
import * as productApi from '../../services/product';
import { API_BASE_URL } from '../../config/api';

type PharmacyDetailsScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList, 'PharmacyDetails'>;
type PharmacyDetailsRouteProp = RouteProp<PharmacyStackParamList, 'PharmacyDetails'>;

const normalizeImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }
  const trimmedUri = imageUri.trim();
  if (!trimmedUri) {
    return null;
  }
  const baseUrl = API_BASE_URL.replace('/api', '');
  let deviceHost: string;
  try {
    const urlObj = new URL(baseUrl);
    deviceHost = urlObj.hostname;
  } catch (e) {
    const match = baseUrl.match(/https?:\/\/([^\/:]+)/);
    deviceHost = match ? match[1] : '192.168.0.114';
  }
  if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
    let normalizedUrl = trimmedUri;
    if (normalizedUrl.includes('localhost')) {
      normalizedUrl = normalizedUrl.replace('localhost', deviceHost);
    }
    if (normalizedUrl.includes('127.0.0.1')) {
      normalizedUrl = normalizedUrl.replace('127.0.0.1', deviceHost);
    }
    return normalizedUrl;
  }
  const imagePath = trimmedUri.startsWith('/') ? trimmedUri : `/${trimmedUri}`;
  return `${baseUrl}${imagePath}`;
};

export const PharmacyDetailsScreen = () => {
  const navigation = useNavigation<PharmacyDetailsScreenNavigationProp>();
  const route = useRoute<PharmacyDetailsRouteProp>();
  const { pharmacyId } = route.params;
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'products'>('overview');

  // Fetch pharmacy details
  const { data: pharmacyData, isLoading: pharmacyLoading, error: pharmacyError } = useQuery({
    queryKey: ['pharmacy', pharmacyId],
    queryFn: () => pharmacyApi.getPharmacyById(pharmacyId),
    enabled: !!pharmacyId,
  });

  const pharmacy = pharmacyData?.data;

  // Extract ownerId - ensure it's a string
  const ownerId = pharmacy?.ownerId
    ? typeof pharmacy.ownerId === 'object' && pharmacy.ownerId._id
      ? String(pharmacy.ownerId._id)
      : String(pharmacy.ownerId)
    : null;
  
  if (__DEV__ && ownerId) {
    console.log('🏥 PharmacyDetails - Extracted ownerId:', ownerId, 'Type:', typeof ownerId);
  }

  // Fetch products from this pharmacy
  const { data: productsData } = useQuery({
    queryKey: ['pharmacyProducts', ownerId],
    queryFn: () => {
      const params: productApi.ProductFilters = { 
        sellerId: ownerId!, 
        sellerType: 'PHARMACY', 
        limit: 6 
      };
      if (__DEV__) {
        console.log('🏥 PharmacyDetails - Fetching products with params:', params);
      }
      return productApi.listProducts(params);
    },
    enabled: !!ownerId,
  });

  const products = productsData?.data?.products || [];

  const formatAddress = (address: pharmacyApi.Pharmacy['address']) => {
    if (!address) return 'Address not available';
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.country,
      address.zip,
    ].filter(Boolean);
    return parts.join(', ') || 'Address not available';
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleViewOnMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (pharmacyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pharmacy details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pharmacyError || !pharmacy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Pharmacy Not Found</Text>
          <Text style={styles.errorText}>The pharmacy you're looking for doesn't exist.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('PharmacySearch')}
          >
            <Text style={styles.backButtonText}>Browse Pharmacies</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pharmacyLogo = pharmacy.logo || '';
  const normalizedImageUrl = normalizeImageUrl(pharmacyLogo);
  const defaultAvatar = require('../../../assets/avatar.png');
  const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
  const pharmacyAddress = formatAddress(pharmacy.address);
  const pharmacyPhone = pharmacy.phone || 'Phone not available';

  const renderProduct = ({ item: product }: { item: productApi.Product }) => {
    const productPrice = product.discountPrice || product.price;
    const originalPrice = product.discountPrice ? product.price : null;
    const productImage = product.images?.[0] || '';
    const normalizedProductImage = normalizeImageUrl(productImage);
    const productImageSource = normalizedProductImage
      ? { uri: normalizedProductImage }
      : defaultAvatar;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
      >
        <Image source={productImageSource} style={styles.productImage} defaultSource={defaultAvatar} />
        <View style={styles.productContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.productPriceRow}>
            <Text style={styles.productPrice}>${productPrice.toFixed(2)}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pharmacy Header */}
        <View style={styles.header}>
          <Image source={imageSource} style={styles.pharmacyImage} defaultSource={defaultAvatar} />
          <View style={styles.pharmacyHeaderInfo}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            {pharmacy.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pharmacy Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>{pharmacyPhone}</Text>
            {pharmacy.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(pharmacy.phone!)}
              >
                <Ionicons name="call" size={16} color={colors.textWhite} />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={2}>
              {pharmacyAddress}
            </Text>
          </View>
          {pharmacy.address?.city && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>City: {pharmacy.address.city}</Text>
            </View>
          )}
          {pharmacy.location?.lat && pharmacy.location?.lng && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => handleViewOnMaps(pharmacy.location!.lat, pharmacy.location!.lng)}
            >
              <Ionicons name="map-outline" size={18} color={colors.primary} />
              <Text style={styles.mapButtonText}>View on Google Maps</Text>
            </TouchableOpacity>
          )}
          {ownerId && (
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => {
                if (__DEV__) {
                  console.log('🏥 PharmacyDetails - Navigating to ProductCatalog with:', {
                    sellerId: ownerId,
                    sellerType: 'PHARMACY',
                  });
                }
                navigation.navigate('ProductCatalog', {
                  sellerId: ownerId,
                  sellerType: 'PHARMACY',
                });
              }}
            >
              <Text style={styles.browseButtonText}>Browse All Products</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'locations' && styles.tabActive]}
            onPress={() => setActiveTab('locations')}
          >
            <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
              Locations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.tabActive]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              Products
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View style={styles.overviewContent}>
              <Text style={styles.sectionTitle}>About Pharmacy</Text>
              <Text style={styles.overviewText}>
                {pharmacy.name} is a registered pharmacy providing quality healthcare products and
                services.
                {pharmacy.address?.city && ` Located in ${pharmacy.address.city}, `}
                we offer a wide range of medicines, medical equipment, and health supplements.
              </Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Contact Information</Text>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Name:</Text>
                  <Text style={styles.contactValue}>{pharmacy.name}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Phone:</Text>
                  <Text style={styles.contactValue}>{pharmacyPhone}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Address:</Text>
                  <Text style={styles.contactValue}>{pharmacyAddress}</Text>
                </View>
                {pharmacy.isActive !== undefined && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.contactValue,
                        pharmacy.isActive ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      {pharmacy.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'locations' && (
            <View style={styles.locationsContent}>
              <Text style={styles.sectionTitle}>Location Details</Text>
              <Text style={styles.locationLabel}>Full Address:</Text>
              <Text style={styles.locationText}>{pharmacyAddress}</Text>
              {pharmacy.address && (
                <View style={styles.addressDetails}>
                  {pharmacy.address.line1 && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>Line 1:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.line1}</Text>
                    </View>
                  )}
                  {pharmacy.address.line2 && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>Line 2:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.line2}</Text>
                    </View>
                  )}
                  {pharmacy.address.city && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>City:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.city}</Text>
                    </View>
                  )}
                  {pharmacy.address.state && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>State:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.state}</Text>
                    </View>
                  )}
                  {pharmacy.address.country && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>Country:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.country}</Text>
                    </View>
                  )}
                  {pharmacy.address.zip && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>ZIP Code:</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.zip}</Text>
                    </View>
                  )}
                </View>
              )}
              {pharmacy.location?.lat && pharmacy.location?.lng && (
                <View style={styles.coordinatesSection}>
                  <Text style={styles.locationLabel}>Coordinates:</Text>
                  <Text style={styles.coordinatesText}>
                    Latitude: {pharmacy.location.lat.toFixed(4)}, Longitude:{' '}
                    {pharmacy.location.lng.toFixed(4)}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => handleViewOnMaps(pharmacy.location!.lat, pharmacy.location!.lng)}
                  >
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={styles.mapButtonText}>View on Google Maps</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'products' && (
            <View style={styles.productsContent}>
              <Text style={styles.sectionTitle}>Products from this Pharmacy</Text>
              {products.length === 0 ? (
                <View style={styles.emptyProducts}>
                  <Ionicons name="cube-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyProductsText}>
                    No products available from this pharmacy.
                  </Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={products}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.productRow}
                    contentContainerStyle={styles.productsList}
                  />
                  {ownerId && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => {
                        if (__DEV__) {
                          console.log('🏥 PharmacyDetails - Navigating to ProductCatalog with:', {
                            sellerId: ownerId,
                            sellerType: 'PHARMACY',
                          });
                        }
                        navigation.navigate('ProductCatalog', {
                          sellerId: ownerId,
                          sellerType: 'PHARMACY',
                        });
                      }}
                    >
                      <Text style={styles.viewAllButtonText}>View All Products</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    backgroundColor: colors.background,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pharmacyImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  pharmacyHeaderInfo: {
    alignItems: 'center',
  },
  pharmacyName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  infoCard: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mapButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: colors.background,
    padding: 16,
    minHeight: 300,
  },
  overviewContent: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  contactInfo: {
    marginTop: 8,
    gap: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 80,
  },
  contactValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  statusActive: {
    color: colors.success,
  },
  statusInactive: {
    color: colors.error,
  },
  locationsContent: {
    gap: 16,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  addressDetails: {
    marginTop: 8,
    gap: 8,
  },
  addressItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 80,
  },
  addressValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  coordinatesSection: {
    marginTop: 16,
  },
  coordinatesText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  productsContent: {
    gap: 16,
  },
  productsList: {
    paddingTop: 8,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    minHeight: 36,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  emptyProducts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyProductsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});

