import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import * as productApi from '../../services/product';
import * as pharmacyApi from '../../services/pharmacy';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';

type ProductListScreenNavigationProp = NativeStackNavigationProp<ProductsStackParamList>;

interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category?: string;
  subCategory?: string;
  sku?: string;
  images?: string[];
  isActive: boolean;
  createdAt?: string;
}

export const ProductListScreen = () => {
  const navigation = useNavigation<ProductListScreenNavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isPharmacyUser = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';

  // Get user ID (support both _id and id)
  const userId = user?._id || user?.id;

  const { data: doctorPharmacyResponse } = useQuery({
    queryKey: ['doctor-pharmacy', userId],
    queryFn: () => pharmacyApi.listPharmacies({ ownerId: userId!, limit: 1 }),
    enabled: !!userId && !isPharmacyUser,
  });

  const { data: myPharmacyResponse } = useQuery({
    queryKey: ['my-pharmacy', userId],
    queryFn: () => pharmacyApi.getMyPharmacy(),
    enabled: !!userId && isPharmacyUser,
  });

  const myPharmacy = useMemo(() => {
    if (isPharmacyUser) {
      const responseData = (myPharmacyResponse as any)?.data || myPharmacyResponse;
      return responseData?.data || responseData || null;
    }
    if (!doctorPharmacyResponse) return null;
    const responseData = doctorPharmacyResponse.data || doctorPharmacyResponse;
    const pharmacies = Array.isArray(responseData) ? responseData : (responseData.pharmacies || []);
    return pharmacies.length > 0 ? pharmacies[0] : null;
  }, [doctorPharmacyResponse, myPharmacyResponse, isPharmacyUser]);

  // Build query params - show only this doctor's products
  const queryParams = useMemo(() => {
    const params: productApi.ProductFilters = {
      sellerType: 'PHARMACY', // Doctor products have sellerType = 'PHARMACY'
      sellerId: userId, // Filter by doctor's userId (which is the pharmacy's ownerId)
    };
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;
    return params;
  }, [userId, searchQuery, categoryFilter]);

  // Fetch products for this doctor
  const { data: productsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['pharmacy-products', queryParams],
    queryFn: () => productApi.listProducts(queryParams),
    enabled: !!userId,
  });

  // Extract products data
  const products = useMemo(() => {
    if (!productsResponse) return [];
    const responseData = productsResponse.data || productsResponse;
    return Array.isArray(responseData) ? responseData : (responseData.products || []);
  }, [productsResponse]);

  // Extract pagination data
  const pagination = useMemo(() => {
    if (!productsResponse) return null;
    const responseData = productsResponse.data || productsResponse;
    return responseData.pagination || null;
  }, [productsResponse]);

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => productApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-products'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product deleted successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete product';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  const handleAddProduct = () => {
    // Check if doctor has a pharmacy
    if (!myPharmacy) {
      // Navigate to PharmacyManagementScreen in MoreStack
      // Use parent navigator to navigate across tabs
      const parentNavigation = navigation.getParent();
      if (parentNavigation) {
        parentNavigation.navigate('More', { screen: isPharmacyUser ? 'PharmacyProfile' : 'PharmacyManagement' });
      } else {
        // Fallback: try direct navigation
        (navigation as any).navigate('More', { screen: isPharmacyUser ? 'PharmacyProfile' : 'PharmacyManagement' });
      }
      Toast.show({
        type: 'info',
        text1: 'Pharmacy Required',
        text2: 'Please create a pharmacy first before adding products',
      });
      return;
    }
    navigation.navigate('AddProduct');
  };

  const handleEditProduct = (productId: string) => {
    navigation.navigate('EditProduct', { productId });
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProductMutation.mutate(product._id);
          },
        },
      ]
    );
  };

  const handleViewProduct = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
  };

  const hasActiveFilters = searchQuery || categoryFilter;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price || 0);
  };

  // Calculate discount percentage
  const getDiscountPercent = (price: number, discountPrice: number) => {
    if (!price || !discountPrice || discountPrice >= price) return 0;
    return Math.round(((price - discountPrice) / price) * 100);
  };

  // Normalize image URL for mobile
  const normalizeImageUrl = (imageUri: string | undefined): string => {
    if (!imageUri) return '';
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const deviceHost =
        API_BASE_URL?.replace('/api', '').replace('http://', '').replace('https://', '') || 'localhost:5000';
      return imageUri.replace(/localhost|127\.0\.0\.1/, deviceHost.split(':')[0]);
    }
    const baseURL = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseURL}${imageUri}`;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const productImage = item.images && item.images.length > 0 ? normalizeImageUrl(item.images[0]) : null;
    const displayPrice = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price;

    return (
      <TouchableOpacity
        style={styles.productRow}
        onPress={() => handleViewProduct(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.productInfo}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Ionicons name="cube-outline" size={32} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
            {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
            <View style={styles.priceContainer}>
              {item.discountPrice && item.discountPrice < item.price ? (
                <View style={styles.discountPriceContainer}>
                  <Text style={styles.originalPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.discountPrice}>{formatPrice(item.discountPrice)}</Text>
                  <Text style={styles.discountPercent}>
                    {getDiscountPercent(item.price, item.discountPrice)}% OFF
                  </Text>
                </View>
              ) : (
                <Text style={styles.productPrice}>{formatPrice(displayPrice)}</Text>
              )}
            </View>
            <View style={styles.stockContainer}>
              <Text style={[styles.stockText, item.stock > 0 ? styles.stockInStock : styles.stockOutOfStock]}>
                Stock: {item.stock || 0}
              </Text>
              <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditProduct(item._id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteProduct(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Pharmacy Info Banner */}
      {myPharmacy ? (
        <View style={styles.pharmacyBanner}>
          <Ionicons name="storefront" size={20} color={colors.success} />
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyName}>Your Pharmacy: {myPharmacy.name}</Text>
            {(myPharmacy as any).address?.city && (
              <Text style={styles.pharmacyLocation}>{(myPharmacy as any).address.city}</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.pharmacyWarningBanner}>
          <Ionicons name="warning" size={20} color={colors.warning} />
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyWarningText}>No Pharmacy Found</Text>
            <Text style={styles.pharmacyWarningSubtext}>
              You need to create a pharmacy before adding products
            </Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterRow}>
          <View style={styles.categoryFilterContainer}>
            <TextInput
              style={styles.categoryInput}
              placeholder="Filter by category"
              placeholderTextColor={colors.textLight}
              value={categoryFilter}
              onChangeText={setCategoryFilter}
            />
          </View>
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Add Product Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddProduct}
          activeOpacity={0.7}
          disabled={!myPharmacy}
        >
          <Ionicons name="add" size={20} color={colors.textWhite} />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Products</Text>
          <Text style={styles.errorText}>
            {(error as any)?.response?.data?.message || (error as any)?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>No products found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || categoryFilter
                  ? 'Try a different search term'
                  : 'Add your first product to get started'}
              </Text>
              {!searchQuery && !categoryFilter && (
                <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddProduct} activeOpacity={0.7}>
                  <Text style={styles.emptyStateButtonText}>Add First Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            pagination && pagination.pages > 1 ? (
              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  pharmacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  pharmacyWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pharmacyLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pharmacyWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pharmacyWarningSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
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
    gap: 8,
    alignItems: 'center',
  },
  categoryFilterContainer: {
    flex: 1,
  },
  categoryInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  productRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.backgroundLight,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  productSku: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 4,
  },
  priceContainer: {
    marginBottom: 4,
  },
  discountPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  discountPercent: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockInStock: {
    color: colors.success,
  },
  stockOutOfStock: {
    color: colors.error,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  paginationInfo: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
