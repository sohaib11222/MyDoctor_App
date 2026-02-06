import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as productApi from '../../services/product';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'ProductDetails'>;
type ProductDetailsRouteProp = RouteProp<ProductsStackParamList, 'ProductDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Normalize image URL - convert relative URLs to absolute URLs
const normalizeImageUrl = (url: string | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const serverBaseUrl = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
  const cleanUrl = url.startsWith('/') ? url : '/' + url;
  return `${serverBaseUrl}${cleanUrl}`;
};

// Format price
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price || 0);
};

// Calculate discount percentage
const getDiscountPercent = (price: number, discountPrice?: number): number => {
  if (!price || !discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
};

// Format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const ProductDetailsScreen = () => {
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const route = useRoute<ProductDetailsRouteProp>();
  const { productId } = route.params;
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyUser = isPharmacy || isParapharmacy;
  const userId = user?._id || user?.id;

  const requiresSubscription = isPharmacy;

  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-pharmacy-subscription', userId],
    queryFn: () => pharmacySubscriptionApi.getMyPharmacySubscription(),
    enabled: !!userId && requiresSubscription,
    retry: 1,
  });

  const subscriptionData = React.useMemo(() => {
    if (!subscriptionResponse) return null;
    const r: any = subscriptionResponse as any;
    const data = r?.data ?? r;
    return data?.data ?? data;
  }, [subscriptionResponse]);

  const hasActiveSubscription = React.useMemo(() => {
    if (!requiresSubscription) return true;
    if (!subscriptionData) return false;
    if (subscriptionData?.hasActiveSubscription === true) return true;
    if (subscriptionData?.subscriptionExpiresAt) return new Date(subscriptionData.subscriptionExpiresAt) > new Date();
    return false;
  }, [subscriptionData]);

  const goToSubscription = () => {
    const parent = (navigation as any).getParent?.();
    if (parent) {
      parent.navigate('More', { screen: 'PharmacySubscription' });
    } else {
      (navigation as any).navigate('More', { screen: 'PharmacySubscription' });
    }
  };

  // Fetch product details
  const {
    data: productResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getProductById(productId),
    enabled: !!productId && isPharmacyUser,
  });

  // Extract product data
  const product: productApi.Product | null = productResponse?.data || null;

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product deleted successfully!',
      });
      navigation.goBack();
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

  const handleEdit = () => {
    if (requiresSubscription && !subscriptionLoading && !hasActiveSubscription) {
      Toast.show({ type: 'info', text1: 'Subscription Required', text2: 'You need an active subscription to manage products' });
      goToSubscription();
      return;
    }
    navigation.navigate('EditProduct', { productId });
  };

  const handleDelete = () => {
    if (requiresSubscription && !subscriptionLoading && !hasActiveSubscription) {
      Toast.show({ type: 'info', text1: 'Subscription Required', text2: 'You need an active subscription to manage products' });
      goToSubscription();
      return;
    }
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product?.name || 'this product'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProductMutation.mutate(productId);
          },
        },
      ]
    );
  };

  // Normalize product images
  const productImages = product?.images
    ?.map((url: string) => normalizeImageUrl(url))
    .filter((url: string | null): url is string => url !== null) || [];

  // Loading state
  if (!isPharmacyUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>This screen is available for pharmacy accounts only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Product</Text>
          <Text style={styles.errorText}>
            {error?.message || 'Failed to load product details. Please try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount ? getDiscountPercent(product.price, product.discountPrice) : 0;
  const mainImage = productImages.length > 0 ? productImages[0] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {requiresSubscription && !subscriptionLoading && !hasActiveSubscription && (
          <TouchableOpacity style={styles.subscriptionBanner} activeOpacity={0.8} onPress={goToSubscription}>
            <Ionicons name="card-outline" size={18} color={colors.warning} />
            <Text style={styles.subscriptionBannerText}>Subscription required to edit or delete products</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        {/* Product Images */}
        {productImages.length > 0 ? (
          <View style={styles.imageContainer}>
            <FlatList
              data={productImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />
              )}
            />
            {productImages.length > 1 && (
              <View style={styles.imageIndicator}>
                <Text style={styles.imageIndicatorText}>
                  {currentImageIndex + 1} / {productImages.length}
                </Text>
              </View>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color={colors.textLight} />
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <View style={styles.titleSection}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.category && (
                <Text style={styles.productCategory}>{product.category}</Text>
              )}
              {product.subCategory && (
                <Text style={styles.productSubCategory}>{product.subCategory}</Text>
              )}
            </View>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: product.isActive ? colors.success : colors.error },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: product.isActive ? colors.success : colors.error },
                ]}
              >
                {product.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            {hasDiscount ? (
              <View style={styles.priceRow}>
                <Text style={styles.discountPrice}>{formatPrice(product.discountPrice!)}</Text>
                <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
              </View>
            ) : (
              <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
            )}
          </View>

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stock:</Text>
              <View style={styles.stockContainer}>
                <Text
                  style={[
                    styles.detailValue,
                    { color: product.stock > 0 ? colors.success : colors.error },
                  ]}
                >
                  {product.stock || 0}
                </Text>
                <Text style={styles.stockUnit}> units</Text>
              </View>
            </View>
            {product.sku && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>SKU:</Text>
                <Text style={styles.detailValue}>{product.sku}</Text>
              </View>
            )}
            {product.createdAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Added:</Text>
                <Text style={styles.detailValue}>{formatDate(product.createdAt)}</Text>
              </View>
            )}
            {product.updatedAt && product.updatedAt !== product.createdAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Updated:</Text>
                <Text style={styles.detailValue}>{formatDate(product.updatedAt)}</Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {product.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
          disabled={deleteProductMutation.isPending || (requiresSubscription && !subscriptionLoading && !hasActiveSubscription)}
        >
          {deleteProductMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          )}
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.editButton,
            { backgroundColor: colors.primary },
            requiresSubscription && !subscriptionLoading && !hasActiveSubscription && { opacity: 0.5 },
          ]}
          onPress={handleEdit}
          activeOpacity={0.7}
          disabled={requiresSubscription && !subscriptionLoading && !hasActiveSubscription}
        >
          <Ionicons name="create-outline" size={20} color={colors.textWhite} />
          <Text style={styles.editButtonText}>Edit Product</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  subscriptionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.background,
    position: 'relative',
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textLight,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageIndicatorText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: colors.background,
    padding: 16,
    marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  productSubCategory: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  discountPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 18,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  tagsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.background,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
