import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import * as productApi from '../../services/product';
import { useCart } from '../../contexts/CartContext';
import { API_BASE_URL } from '../../config/api';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList, 'ProductDetails'>;
type ProductDetailsRouteProp = RouteProp<PharmacyStackParamList, 'ProductDetails'>;

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

export const ProductDetailsScreen = () => {
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const route = useRoute<ProductDetailsRouteProp>();
  const { productId } = route.params;
  const { addToCart } = useCart();
  const { t, i18n } = useTranslation();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    navigation.setOptions({
      title: t('pharmacy.nav.productDetails'),
    });
  }, [navigation, t, i18n.language]);

  // Fetch product details
  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getProductById(productId),
    enabled: !!productId,
  });

  const product = productData?.data;

  useEffect(() => {
    if (product?.stock && quantity > product.stock) {
      setQuantity(product.stock);
    }
  }, [product, quantity]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity < 1) return;
    if (product?.stock && newQuantity > product.stock) {
      Toast.show({
        type: 'warning',
        text1: t('pharmacy.cartToast.stockLimitTitle'),
        text2: t('pharmacy.cartToast.stockLimitBody', { count: product.stock }),
      });
      return;
    }
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === 0) {
      Toast.show({
        type: 'error',
        text1: t('pharmacy.cartToast.outOfStockTitle'),
        text2: t('pharmacy.cartToast.outOfStockBody'),
      });
      return;
    }
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock === 0) {
      Toast.show({
        type: 'error',
        text1: t('pharmacy.cartToast.outOfStockTitle'),
        text2: t('pharmacy.cartToast.outOfStockBody'),
      });
      return;
    }
    addToCart(product, quantity);
    navigation.navigate('Checkout');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacy.product.loadingProductDetails')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>{t('pharmacy.product.productNotFoundTitle')}</Text>
          <Text style={styles.errorText}>{t('pharmacy.product.productNotFoundBody')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('ProductCatalog')}
          >
            <Text style={styles.backButtonText}>{t('pharmacy.common.browseProducts')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const productPrice = product.discountPrice || product.price;
  const originalPrice = product.discountPrice ? product.price : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - productPrice) / originalPrice) * 100)
    : 0;
  const productImage = product.images?.[0] || '';
  const normalizedImageUrl = normalizeImageUrl(productImage);
  const defaultAvatar = require('../../../assets/avatar.png');
  const imageSource = normalizedImageUrl ? { uri: normalizedImageUrl } : defaultAvatar;
  const isInStock = product.stock > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image and Basic Info */}
        <View style={styles.productHeader}>
          <Image source={imageSource} style={styles.productImage} defaultSource={defaultAvatar} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.sellerId && typeof product.sellerId === 'object' && (
              <Text style={styles.manufacturer}>
                <Text style={styles.manufacturerLabel}>{t('pharmacy.product.soldBy')}</Text>
                {product.sellerId.fullName || t('pharmacy.product.unknownSeller')}
              </Text>
            )}
            <Text style={styles.description}>
              {product.description || t('pharmacy.product.noDescriptionAvailable')}
            </Text>
            {product.tags && product.tags.length > 0 && (
              <View style={styles.appliedForSection}>
                <Text style={styles.appliedForTitle}>{t('pharmacy.product.tags')}</Text>
                {product.tags.map((tag, index) => (
                  <View key={index} style={styles.appliedForItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.appliedForText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pharmacy.product.productDetails')}</Text>
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.detailItem}>
            <Text style={styles.detailTitle}>{t('pharmacy.product.description')}</Text>
            <Text style={styles.detailText}>
              {product.description || t('pharmacy.product.noDescriptionForProduct')}
            </Text>
          </View>

          {/* Category */}
          {product.category && (
            <View style={styles.detailItem}>
              <Text style={styles.detailTitle}>{t('pharmacy.product.category')}</Text>
              <Text style={styles.detailText}>{product.category}</Text>
              {product.subCategory && (
                <Text style={styles.detailText}>
                  {t('pharmacy.product.subcategory', { name: product.subCategory })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Product Specifications Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${productPrice.toFixed(2)}</Text>
              {originalPrice && (
                <>
                  <Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        {t('pharmacy.product.percentOff', { percent: discountPercent })}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            <View style={[styles.stockBadge, isInStock ? styles.stockBadgeActive : styles.stockBadgeInactive]}>
              <Text style={styles.stockText}>
                {isInStock
                  ? t('pharmacy.product.inStock', { count: product.stock })
                  : t('pharmacy.product.outOfStock')}
              </Text>
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>{t('pharmacy.product.quantity')}</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={18} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                  disabled={!isInStock || (product.stock && quantity >= product.stock)}
                >
                  <Ionicons name="add" size={18} color={colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Add to Cart Button */}
            <Button
              title={t('pharmacy.product.addToCart')}
              onPress={handleAddToCart}
              disabled={!isInStock}
              style={styles.addToCartButton}
            />
            <Button
              title={t('pharmacy.product.buyNow')}
              onPress={handleBuyNow}
              disabled={!isInStock}
              style={styles.buyNowButton}
            />

            {/* Product Specs */}
            <View style={styles.specsCard}>
              {product.sku && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('pharmacy.product.sku')}</Text>
                  <Text style={styles.specValue}>{product.sku}</Text>
                </View>
              )}
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>{t('pharmacy.product.stock')}</Text>
                <Text style={styles.specValue}>
                  {t('pharmacy.product.units', { count: product.stock || 0 })}
                </Text>
              </View>
              {product.category && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{t('pharmacy.product.category')}</Text>
                  <Text style={styles.specValue}>{product.category}</Text>
                </View>
              )}
            </View>

            {/* Benefits Card */}
            <View style={styles.benefitsCard}>
              <View style={styles.benefitItem}>
                <Ionicons name="car" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{t('pharmacy.product.freeShipping')}</Text>
                  <Text style={styles.benefitSubtitle}>{t('pharmacy.product.freeShippingSubtitle')}</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="help-circle" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{t('pharmacy.product.support247')}</Text>
                  <Text style={styles.benefitSubtitle}>{t('pharmacy.product.support247Subtitle')}</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{t('pharmacy.product.safety')}</Text>
                  <Text style={styles.benefitSubtitle}>{t('pharmacy.product.safetySubtitle')}</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="pricetag" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{t('pharmacy.product.hotOffers')}</Text>
                  <Text style={styles.benefitSubtitle}>{t('pharmacy.product.hotOffersSubtitle')}</Text>
                </View>
              </View>
            </View>
          </View>
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
  productHeader: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  manufacturer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  manufacturerLabel: {
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  appliedForSection: {
    marginTop: 8,
  },
  appliedForTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  appliedForItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 8,
  },
  appliedForText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.background,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sidebar: {
    backgroundColor: colors.background,
    padding: 16,
  },
  priceCard: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  stockBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 12,
  },
  addToCartButton: {
    marginBottom: 12,
  },
  buyNowButton: {
    marginBottom: 16,
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
  stockBadgeActive: {
    backgroundColor: colors.success,
  },
  stockBadgeInactive: {
    backgroundColor: colors.error,
  },
  specsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  specLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  benefitsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  benefitText: {
    marginLeft: 12,
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

