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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'products'>('overview');

  // Fetch pharmacy details
  const { data: pharmacyData, isLoading: pharmacyLoading, error: pharmacyError } = useQuery({
    queryKey: ['pharmacy', pharmacyId],
    queryFn: () => pharmacyApi.getPharmacyById(pharmacyId),
    enabled: !!pharmacyId,
  });

  const pharmacy = pharmacyData?.data;

  const sellerType = String((pharmacy as any)?.kind || '').toUpperCase() === 'PARAPHARMACY' ? 'PARAPHARMACY' : 'PHARMACY';

  // Extract ownerId - ensure it's a string
  const rawOwnerId = (pharmacy as any)?.ownerId;
  const ownerId = rawOwnerId
    ? typeof rawOwnerId === 'string'
      ? rawOwnerId
      : rawOwnerId?._id
        ? String(rawOwnerId._id)
        : null
    : null;
  
  if (__DEV__ && ownerId) {
    console.log('🏥 PharmacyDetails - Extracted ownerId:', ownerId, 'Type:', typeof ownerId);
  }

  // Fetch products from this pharmacy
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', pharmacyId],
    queryFn: () => {
      const params: productApi.ProductFilters = { 
        sellerId: ownerId!, 
        sellerType: sellerType as any,
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
    if (!address) return t('pharmacy.common.addressNotAvailable');
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.country,
      address.zip,
    ].filter(Boolean);
    return parts.join(', ') || t('pharmacy.common.addressNotAvailable');
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
          <Text style={styles.loadingText}>{t('pharmacy.details.loadingPharmacyDetails')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pharmacyError || !pharmacy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>{t('pharmacy.details.pharmacyNotFoundTitle')}</Text>
          <Text style={styles.errorText}>{t('pharmacy.details.pharmacyNotFoundBody')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('PharmacySearch')}
          >
            <Text style={styles.backButtonText}>{t('pharmacy.details.browsePharmacies')}</Text>
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
  const pharmacyPhone = pharmacy.phone || t('pharmacy.common.phoneNotAvailable');

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
                <Text style={styles.activeBadgeText}>{t('pharmacy.details.active')}</Text>
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
                <Text style={styles.callButtonText}>{t('pharmacy.details.call')}</Text>
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
              <Text style={styles.infoText}>{t('pharmacy.details.cityLabel', { city: pharmacy.address.city })}</Text>
            </View>
          )}
          {pharmacy.location?.lat && pharmacy.location?.lng && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => handleViewOnMaps(pharmacy.location!.lat, pharmacy.location!.lng)}
            >
              <Ionicons name="map-outline" size={18} color={colors.primary} />
              <Text style={styles.mapButtonText}>{t('pharmacy.details.viewOnGoogleMaps')}</Text>
            </TouchableOpacity>
          )}
          {ownerId && (
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => {
                if (__DEV__) {
                  console.log('🏥 PharmacyDetails - Navigating to ProductCatalog with:', {
                    sellerId: ownerId,
                    sellerType,
                  });
                }
                navigation.navigate('ProductCatalog', {
                  sellerId: ownerId,
                  sellerType: sellerType as any,
                });
              }}
            >
              <Text style={styles.browseButtonText}>{t('pharmacy.common.browseAllProducts')}</Text>
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
              {t('pharmacy.details.overviewTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'locations' && styles.tabActive]}
            onPress={() => setActiveTab('locations')}
          >
            <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
              {t('pharmacy.details.locationsTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.tabActive]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              {t('pharmacy.details.productsTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View style={styles.overviewContent}>
              <Text style={styles.sectionTitle}>{t('pharmacy.details.aboutPharmacy')}</Text>
              <Text style={styles.overviewText}>
                {t('pharmacy.details.overviewIntro', { name: pharmacy.name })}
                {pharmacy.address?.city
                  ? t('pharmacy.details.locatedIn', { city: pharmacy.address.city })
                  : ''}
                {t('pharmacy.details.overviewOutro')}
              </Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{t('pharmacy.details.contactInformation')}</Text>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>{t('pharmacy.details.contactName')}</Text>
                  <Text style={styles.contactValue}>{pharmacy.name}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>{t('pharmacy.details.contactPhone')}</Text>
                  <Text style={styles.contactValue}>{pharmacyPhone}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>{t('pharmacy.details.contactAddress')}</Text>
                  <Text style={styles.contactValue}>{pharmacyAddress}</Text>
                </View>
                {pharmacy.isActive !== undefined && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>{t('pharmacy.details.contactStatus')}</Text>
                    <Text
                      style={[
                        styles.contactValue,
                        pharmacy.isActive ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      {pharmacy.isActive ? t('pharmacy.details.active') : t('pharmacy.details.inactive')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'locations' && (
            <View style={styles.locationsContent}>
              <Text style={styles.sectionTitle}>{t('pharmacy.details.locationDetails')}</Text>
              <Text style={styles.locationLabel}>{t('pharmacy.details.fullAddress')}</Text>
              <Text style={styles.locationText}>{pharmacyAddress}</Text>
              {pharmacy.address && (
                <View style={styles.addressDetails}>
                  {pharmacy.address.line1 && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.line1')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.line1}</Text>
                    </View>
                  )}
                  {pharmacy.address.line2 && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.line2')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.line2}</Text>
                    </View>
                  )}
                  {pharmacy.address.city && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.city')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.city}</Text>
                    </View>
                  )}
                  {pharmacy.address.state && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.state')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.state}</Text>
                    </View>
                  )}
                  {pharmacy.address.country && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.country')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.country}</Text>
                    </View>
                  )}
                  {pharmacy.address.zip && (
                    <View style={styles.addressItem}>
                      <Text style={styles.addressLabel}>{t('pharmacy.details.zipCode')}</Text>
                      <Text style={styles.addressValue}>{pharmacy.address.zip}</Text>
                    </View>
                  )}
                </View>
              )}
              {pharmacy.location?.lat && pharmacy.location?.lng && (
                <View style={styles.coordinatesSection}>
                  <Text style={styles.locationLabel}>{t('pharmacy.details.coordinates')}</Text>
                  <Text style={styles.coordinatesText}>
                    {t('pharmacy.details.latitudeLongitude', {
                      lat: pharmacy.location.lat.toFixed(4),
                      lng: pharmacy.location.lng.toFixed(4),
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => handleViewOnMaps(pharmacy.location!.lat, pharmacy.location!.lng)}
                  >
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={styles.mapButtonText}>{t('pharmacy.details.viewOnGoogleMaps')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'products' && (
            <View style={styles.productsContent}>
              <Text style={styles.sectionTitle}>{t('pharmacy.details.productsFromThisPharmacy')}</Text>
              {products.length === 0 ? (
                <View style={styles.emptyProducts}>
                  <Ionicons name="cube-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyProductsText}>
                    {t('pharmacy.details.noProductsFromThisPharmacy')}
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
                            sellerType,
                          });
                        }
                        navigation.navigate('ProductCatalog', {
                          sellerId: ownerId,
                          sellerType: sellerType as any,
                        });
                      }}
                    >
                      <Text style={styles.viewAllButtonText}>{t('pharmacy.common.viewAllProducts')}</Text>
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

