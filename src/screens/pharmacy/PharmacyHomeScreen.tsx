import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as productApi from '../../services/product';
import { useCart } from '../../contexts/CartContext';
import { API_BASE_URL } from '../../config/api';

type PharmacyHomeScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

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

export const PharmacyHomeScreen = () => {
  const navigation = useNavigation<PharmacyHomeScreenNavigationProp>();
  const { addToCart } = useCart();

  // Fetch featured products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: () => productApi.listProducts({ limit: 8 }),
  });

  const products = productsData?.data?.products || [];

  // Get unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).slice(0, 6);

  const handleAddToCart = (product: productApi.Product) => {
    addToCart(product, 1);
  };

  const { getCartItemCount } = useCart();
  const cartCount = getCartItemCount();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerHeaderTitle}>Pharmacy</Text>
            <TouchableOpacity
              style={styles.cartIconContainer}
              onPress={() => navigation.navigate('Cart')}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={24} color={colors.textWhite} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>From the Leading Online Pharmacy</Text>
            <Text style={styles.bannerSubtitle}>& Healthcare Platform Company</Text>
            <Text style={styles.bannerDescription}>
              Essentials Nutrition & Supplements from all over the suppliers around the World
            </Text>
            <View style={styles.bannerButtons}>
              <TouchableOpacity
                style={styles.shopNowButton}
                onPress={() => navigation.navigate('ProductCatalog')}
              >
                <Text style={styles.shopNowText}>Shop Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchPharmaciesButton}
                onPress={() => navigation.navigate('PharmacySearch')}
              >
                <Ionicons name="search" size={18} color={colors.textWhite} />
                <Text style={styles.searchPharmaciesText}>Find Pharmacies</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Categories Section */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Popular Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryCard}
                  onPress={() =>
                    navigation.navigate('ProductCatalog', {
                      category,
                    })
                  }
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name="cube-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.categoryName}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}


        {/* Featured Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductCatalog')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => {
                const productPrice = product.discountPrice || product.price;
                const originalPrice = product.discountPrice ? product.price : null;
                const productImage = product.images?.[0] || '';
                const normalizedImageUrl = normalizeImageUrl(productImage);
                const defaultAvatar = require('../../../assets/avatar.png');
                const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;

                return (
                  <TouchableOpacity
                    key={product._id}
                    style={styles.productCard}
                    onPress={() => navigation.navigate('ProductDetails', { productId: product._id })}
                  >
                    <View style={styles.productImageContainer}>
                      <Image
                        source={imageSource}
                        style={styles.productImage}
                        defaultSource={defaultAvatar}
                      />
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
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            handleAddToCart(product);
                          }}
                        >
                          <Ionicons name="cart-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
  bannerSection: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomRightRadius:30,
    borderBottomLeftRadius:30,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textWhite,
  },
  cartIconContainer: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '600',
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  bannerDescription: {
    fontSize: 14,
    color: colors.textWhite,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  bannerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shopNowButton: {
    backgroundColor: colors.textWhite,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  searchPharmaciesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  searchPharmaciesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  welcomeSection: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  welcomeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  promotionalCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promotionalContent: {
    flex: 1,
    marginRight: 12,
  },
  promotionalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  promotionalHighlight: {
    color: colors.primary,
  },
  promotionalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  promotionalCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  promotionalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promotionalButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  promotionalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  dealsContainer: {
    paddingRight: 16,
  },
  dealCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  dealImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  dealName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryCard: {
    width: 100,
    marginRight: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});
