import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  SafeAreaView,
  FlatList,
  Modal,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as productApi from '../../services/product';
import { useCart } from '../../contexts/CartContext';
import { API_BASE_URL } from '../../config/api';
import { useTranslation } from 'react-i18next';

type ProductCatalogScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList, 'ProductCatalog'>;
type ProductCatalogRouteProp = RouteProp<PharmacyStackParamList, 'ProductCatalog'>;

const { width } = Dimensions.get('window');

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

export const ProductCatalogScreen = () => {
  const navigation = useNavigation<ProductCatalogScreenNavigationProp>();
  const route = useRoute<ProductCatalogRouteProp>();
  const { addToCart } = useCart();
  const { t } = useTranslation();
  const sellerId = route.params?.sellerId;
  const sellerType = route.params?.sellerType;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const limit = 12;

  const { data: productsData, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['products', { search: searchQuery, category: selectedCategory, sellerId, sellerType, page, limit }],
    queryFn: () => {
      const params: productApi.ProductFilters = { search: searchQuery, page, limit };
      if (selectedCategory) params.category = selectedCategory;
      // Ensure sellerId is a string
      if (sellerId) {
        params.sellerId = typeof sellerId === 'string' ? sellerId : String(sellerId);
      }
      if (sellerType) params.sellerType = sellerType;
      
      if (__DEV__) {
        console.log('🔍 ProductCatalog - Fetching products with params:', params);
      }
      
      return productApi.listProducts(params);
    },
    enabled: true, // Always enabled, even if sellerId is not provided (shows all products)
  });

  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination || { page: 1, limit, total: 0, pages: 1 };

  // Get unique categories from products
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((product) => {
      if (product.category) categorySet.add(product.category);
    });
    return Array.from(categorySet).sort();
  }, [products]);

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) {
      setSelectedCategory('');
    } else {
      setSelectedCategory(category);
    }
    setPage(1);
  };

  const handleAddToCart = (e: any, product: productApi.Product) => {
    e?.stopPropagation?.();
    addToCart(product, 1);
  };

  const renderProduct = ({ item: product }: { item: productApi.Product }) => {
    const productPrice = product.discountPrice || product.price;
    const originalPrice = product.discountPrice ? product.price : null;
    const productImage = product.images?.[0] || '';
    const normalizedImageUrl = normalizeImageUrl(productImage);
    const defaultAvatar = require('../../../assets/avatar.png');
    const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
      >
        <View style={styles.productImageContainer}>
          <Image source={imageSource} style={styles.productImage} defaultSource={defaultAvatar} />
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.productContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.productPriceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>${productPrice.toFixed(2)}</Text>
              {originalPrice && (
                <Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={(e) => handleAddToCart(e, product)}
            >
              <Ionicons name="cart-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('pharmacy.catalog.searchProductsPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={18} color={colors.primary} />
            <Text style={styles.filterButtonText}>{t('pharmacy.catalog.filter')}</Text>
          </TouchableOpacity>
          <Text style={styles.productCount}>
            {t('pharmacy.catalog.showingProducts', { shown: products.length, total: pagination.total })}
            {sellerId && sellerType ? t('pharmacy.catalog.fromThisSeller') : ''}
          </Text>
        </View>
      </View>

      {/* Products List */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacy.catalog.loadingProducts')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>{t('pharmacy.catalog.failedToLoadProducts')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>{t('pharmacy.catalog.noProductsFound')}</Text>
          <Text style={styles.emptySubtext}>{t('pharmacy.catalog.emptySubtext')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                  onPress={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <Text
                    style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}
                  >
                    {t('pharmacy.common.previous')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  {t('pharmacy.common.pageOf', { page, pages: pagination.pages })}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    page === pagination.pages && styles.pageButtonDisabled,
                  ]}
                  onPress={() => setPage(page + 1)}
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
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pharmacy.catalog.filterByCategory')}</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.categoryFilterItem}
                onPress={() => handleCategoryChange('')}
              >
                <View style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      !selectedCategory && styles.checkboxChecked,
                    ]}
                  >
                    {!selectedCategory && (
                      <Ionicons name="checkmark" size={16} color={colors.textWhite} />
                    )}
                  </View>
                  <Text style={styles.categoryFilterText}>{t('pharmacy.catalog.allCategories')}</Text>
                </View>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryFilterItem}
                  onPress={() => handleCategoryChange(category)}
                >
                  <View style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedCategory === category && styles.checkboxChecked,
                      ]}
                    >
                      {selectedCategory === category && (
                        <Ionicons name="checkmark" size={16} color={colors.textWhite} />
                      )}
                    </View>
                    <Text style={styles.categoryFilterText}>{category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                  setPage(1);
                }}
              >
                <Text style={styles.resetButtonText}>{t('pharmacy.common.clearFilters')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilterModal(false);
                  setPage(1);
                  refetch();
                }}
              >
                <Text style={styles.applyButtonText}>{t('common.apply')}</Text>
              </TouchableOpacity>
            </View>
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
  searchSection: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  productCount: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
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
  productsList: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  categoryFilterItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryFilterText: {
    fontSize: 14,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

