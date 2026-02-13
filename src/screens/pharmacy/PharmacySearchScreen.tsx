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
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as pharmacyApi from '../../services/pharmacy';
import { API_BASE_URL } from '../../config/api';
import { useTranslation } from 'react-i18next';

type PharmacySearchScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList, 'PharmacySearch'>;
type PharmacySearchRouteProp = RouteProp<PharmacyStackParamList, 'PharmacySearch'>;

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

export const PharmacySearchScreen = () => {
  const navigation = useNavigation<PharmacySearchScreenNavigationProp>();
  const route = useRoute<PharmacySearchRouteProp>();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [kind, setKind] = useState<'PHARMACY' | 'PARAPHARMACY'>('PHARMACY');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: pharmaciesData, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['pharmacies', { kind, search: searchTerm, city: cityFilter, page, limit }],
    queryFn: () => pharmacyApi.listPharmacies({ kind, search: searchTerm, city: cityFilter, page, limit }),
  });

  const pharmacies = pharmaciesData?.data?.pharmacies || [];
  const pagination = pharmaciesData?.data?.pagination || { page: 1, limit, total: 0, pages: 1 };

  // Get unique cities from pharmacies
  const cities = Array.from(new Set(pharmacies.map((p) => p.address?.city).filter(Boolean))).sort() as string[];

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleKindChange = (nextKind: 'PHARMACY' | 'PARAPHARMACY') => {
    if (nextKind === kind) return;
    setKind(nextKind);
    setPage(1);
  };

  const handleCityChange = (selectedCity: string) => {
    if (selectedCity && selectedCity !== cityFilter) {
      setCityFilter(selectedCity);
    } else {
      setCityFilter('');
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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

  const renderPharmacyCard = ({ item: pharmacy }: { item: pharmacyApi.Pharmacy }) => {
    const rawOwner = (pharmacy as any)?.ownerId;
    const ownerProfileImage = rawOwner && typeof rawOwner === 'object' ? rawOwner.profileImage : null;
    const pharmacyLogo = pharmacy.logo || ownerProfileImage || '';
    const normalizedImageUrl = normalizeImageUrl(pharmacyLogo);
    const defaultAvatar = require('../../../assets/avatar.png');
    const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

    // Extract ownerId - ensure it's a string
    const rawOwnerId = rawOwner;
    const ownerId = rawOwnerId
      ? typeof rawOwnerId === 'string'
        ? rawOwnerId
        : rawOwnerId?._id
          ? String(rawOwnerId._id)
          : null
      : null;
    const pharmacyAddress = formatAddress(pharmacy.address);
    const pharmacyPhone = pharmacy.phone || t('pharmacy.common.phoneNotAvailable');

    return (
      <View style={styles.pharmacyCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PharmacyDetails', { pharmacyId: pharmacy._id })}
        >
          <Image source={imageSource} style={styles.pharmacyImage} defaultSource={defaultAvatar} />
        </TouchableOpacity>
        <View style={styles.pharmacyInfo}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PharmacyDetails', { pharmacyId: pharmacy._id })}
          >
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          </TouchableOpacity>
          <View style={styles.pharmacyDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>{pharmacyPhone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText} numberOfLines={2}>
                {pharmacyAddress}
              </Text>
            </View>
            {pharmacy.address?.city && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{pharmacy.address.city}</Text>
              </View>
            )}
          </View>
          <View style={styles.pharmacyActions}>
            {ownerId && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => {
                  if (__DEV__) {
                    console.log('🔍 PharmacySearch - Navigating to ProductCatalog with:', {
                      sellerId: ownerId,
                      sellerType: kind,
                    });
                  }
                  navigation.navigate('ProductCatalog', {
                    sellerId: ownerId,
                    sellerType: kind,
                  });
                }}
              >
                <Text style={styles.browseButtonText}>{t('pharmacy.search.browseProducts')}</Text>
              </TouchableOpacity>
            )}
            {pharmacy.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(pharmacy.phone!)}
              >
                <Ionicons name="call" size={16} color={colors.textWhite} />
                <Text style={styles.callButtonText}>{t('pharmacy.search.call')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.kindTabs}>
        <TouchableOpacity
          style={[styles.kindTab, kind === 'PHARMACY' && styles.kindTabActive]}
          onPress={() => handleKindChange('PHARMACY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kindTabText, kind === 'PHARMACY' && styles.kindTabTextActive]}>{t('pharmacy.search.pharmaciesTab')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kindTab, kind === 'PARAPHARMACY' && styles.kindTabActive]}
          onPress={() => handleKindChange('PARAPHARMACY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kindTabText, kind === 'PARAPHARMACY' && styles.kindTabTextActive]}>{t('pharmacy.search.parapharmaciesTab')}</Text>
        </TouchableOpacity>
      </View>
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              kind === 'PARAPHARMACY'
                ? t('pharmacy.search.searchParapharmaciesPlaceholder')
                : t('pharmacy.search.searchPharmaciesPlaceholder')
            }
            placeholderTextColor={colors.textLight}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterContainer}>
          <View style={styles.filterInputContainer}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.filterInput}
              placeholder={t('pharmacy.search.enterCityPlaceholder')}
              placeholderTextColor={colors.textLight}
              value={cityFilter}
              onChangeText={setCityFilter}
            />
          </View>
          {cities.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.citiesList}>
              {cities.slice(0, 5).map((cityName, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cityChip,
                    cityFilter === cityName && styles.cityChipActive,
                  ]}
                  onPress={() => handleCityChange(cityName)}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      cityFilter === cityName && styles.cityChipTextActive,
                    ]}
                  >
                    {cityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchTerm('');
              setCityFilter('');
              setPage(1);
            }}
          >
            <Text style={styles.clearButtonText}>{t('pharmacy.common.clearFilters')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {kind === 'PARAPHARMACY'
              ? t('pharmacy.search.loadingParapharmacies')
              : t('pharmacy.search.loadingPharmacies')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>{t('pharmacy.search.failedToLoadPharmacies')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : pharmacies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>{t('pharmacy.search.noPharmaciesFound')}</Text>
          <Text style={styles.emptySubtext}>{t('pharmacy.search.tryAdjustingFilters')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {t('pharmacy.search.showingPharmacies', { shown: pharmacies.length, total: pagination.total })}
            </Text>
          </View>
          <FlatList
            data={pharmacies}
            renderItem={renderPharmacyCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            ListFooterComponent={
              pagination.pages > 1 ? (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <Text style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}>
                      {t('pharmacy.common.previous')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>
                    {t('pharmacy.common.pageOf', { page, pages: pagination.pages })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageButton, page === pagination.pages && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(page + 1)}
                    disabled={page === pagination.pages}
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        page === pagination.pages && styles.pageButtonTextDisabled,
                      ]}
                    >
                      {t('pharmacy.common.next')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  kindTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  kindTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  kindTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  kindTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  kindTabTextActive: {
    color: colors.textWhite,
  },
  searchSection: {
    padding: 16,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filterContainer: {
    gap: 8,
  },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  citiesList: {
    marginTop: 4,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    color: colors.text,
  },
  cityChipTextActive: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  resultsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  pharmacyCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pharmacyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pharmacyDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  pharmacyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  browseButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  browseButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
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
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  pageButtonDisabled: {
    backgroundColor: colors.backgroundLight,
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  pageButtonTextDisabled: {
    color: colors.textSecondary,
  },
  pageInfo: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});

