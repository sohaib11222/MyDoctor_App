import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ProductsStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import * as productApi from '../../services/product';
import * as uploadApi from '../../services/upload';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import { useAuth } from '../../contexts/AuthContext';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';
import { useTranslation } from 'react-i18next';

type EditProductScreenNavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'EditProduct'>;
type EditProductRouteProp = RouteProp<ProductsStackParamList, 'EditProduct'>;

const categories = [
  'Family Care',
  'Skin Care',
  'Hair Care',
  'Lip Care',
  "Men's Care",
  "Women's Care",
  'Baby care',
  'Phytopathology',
  'Cancer',
  'Fitness & Wellness',
];

export const EditProductScreen = () => {
  const navigation = useNavigation<EditProductScreenNavigationProp>();
  const route = useRoute<EditProductRouteProp>();
  const { productId } = route.params;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
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

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [tags, setTags] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  // Fetch product data
  const { data: productResponse, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getProductById(productId),
    enabled: !!productId && isPharmacyUser,
  });

  if (!isPharmacyUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.common.pharmacyAccountsOnly')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.dashboard.banners.loadingSubscription')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="card-outline" size={54} color={colors.warning} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.products.edit.gates.subscriptionRequiredBody')}</Text>
          <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 16 }}>
            <Button title={t('pharmacyAdmin.orders.actions.viewSubscriptionPlans')} onPress={goToSubscription} />
          </View>
          <View style={{ width: '100%', paddingHorizontal: 24, marginTop: 10 }}>
            <Button title={t('common.goBack')} onPress={() => navigation.goBack()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: (data: productApi.UpdateProductData) => productApi.updateProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('pharmacyAdmin.products.edit.toasts.productUpdated'),
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || t('pharmacyAdmin.products.edit.errors.failedToUpdateProduct');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Initialize form data when product is loaded
  useEffect(() => {
    if (productResponse?.data) {
      const product = productResponse.data as productApi.Product;
      setProductName(product.name || '');
      setPrice(product.price !== undefined && product.price !== null ? String(product.price) : '');
      setStock(product.stock !== undefined && product.stock !== null ? String(product.stock) : '');
      setDescription(product.description || '');
      setSku(product.sku || '');
      setDiscountPrice(
        product.discountPrice !== undefined && product.discountPrice !== null ? String(product.discountPrice) : ''
      );
      setCategory(product.category || '');
      setSubCategory(product.subCategory || '');
      setTags(Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '');
      setIsActive(product.isActive !== undefined ? product.isActive : true);
      setProductImages(Array.isArray(product.images) ? product.images : []);
    }
  }, [productResponse]);

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

  const getMimeAndName = (asset: ImagePicker.ImagePickerAsset, index: number) => {
    const baseName = asset.fileName?.trim() || `product-${Date.now()}-${index}`;
    const hasExt = /\.(jpe?g|png|webp)$/i.test(baseName);
    const name = hasExt ? baseName : `${baseName.replace(/\.[^/.]+$/, '')}.jpg`;
    const mime = /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
    return { mime, name };
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pharmacyAdmin.common.permissionRequiredTitle'), t('pharmacyAdmin.common.cameraRollPermissionBody'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        setImageFiles([...imageFiles, ...result.assets]);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('pharmacyAdmin.products.edit.errors.failedToPickImage'),
      });
    }
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!productName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.required'),
        text2: t('pharmacyAdmin.products.edit.validation.productNameRequired'),
      });
      return;
    }

    // Validate price
    const priceValue = price ? parseFloat(price) : null;
    if (priceValue === null || isNaN(priceValue) || priceValue < 0) {
      Toast.show({
        type: 'error',
        text1: t('pharmacyAdmin.products.edit.validation.invalidPriceTitle'),
        text2: t('pharmacyAdmin.products.edit.validation.invalidPriceBody'),
      });
      return;
    }

    // Validate stock
    let stockValue = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
      const stockStr = typeof stock === 'string' ? stock.trim() : String(stock);
      if (stockStr !== '') {
        stockValue = parseInt(stockStr);
        if (isNaN(stockValue) || stockValue < 0) {
          Toast.show({
            type: 'error',
            text1: t('pharmacyAdmin.products.edit.validation.invalidStockTitle'),
            text2: t('pharmacyAdmin.products.edit.validation.invalidStockBody'),
          });
          return;
        }
      }
    }

    // Validate discount price if provided
    let discountPriceValue = null;
    if (discountPrice !== undefined && discountPrice !== null && discountPrice !== '') {
      const discountStr = typeof discountPrice === 'string' ? discountPrice.trim() : String(discountPrice);
      if (discountStr !== '') {
        discountPriceValue = parseFloat(discountStr);
        if (isNaN(discountPriceValue) || discountPriceValue < 0) {
          Toast.show({
            type: 'error',
            text1: t('pharmacyAdmin.products.edit.validation.invalidDiscountTitle'),
            text2: t('pharmacyAdmin.products.edit.validation.invalidDiscountNonNegativeBody'),
          });
          return;
        }
        if (discountPriceValue >= priceValue) {
          Toast.show({
            type: 'error',
            text1: t('pharmacyAdmin.products.edit.validation.invalidDiscountTitle'),
            text2: t('pharmacyAdmin.products.edit.validation.invalidDiscountLessThanPriceBody'),
          });
          return;
        }
      }
    }

    let tempFileUris: string[] = [];

    try {
      let imageUrls = [...productImages];

      // Upload new images if files selected
      if (imageFiles.length > 0) {
        // Copy each image to cache (file://). Android cannot read content://; axios FormData → ERR_NETWORK.
        const copied = await Promise.all(
          imageFiles.map(async (asset, index) => {
            const { mime, name } = getMimeAndName(asset, index);
            const fileUri = await copyImageToCacheUri(asset.uri, index, mime);
            tempFileUris.push(fileUri);
            return { uri: fileUri, mime, name };
          })
        );

        const uploadedUrls = await uploadApi.uploadProductImages(copied);
        imageUrls = [...imageUrls, ...uploadedUrls];
      }

      // Convert relative image URLs to full URLs if needed
      const serverBaseUrl = API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      const fullImageUrls = imageUrls
        .map((url) => {
          if (!url || typeof url !== 'string') return null;
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          const cleanUrl = url.startsWith('/') ? url : '/' + url;
          return `${serverBaseUrl}${cleanUrl}`;
        })
        .filter((url) => url !== null && url !== '') as string[];

      // Parse tags
      const tagsArray = tags && tags.trim() ? tags.split(',').map((tag) => tag.trim()).filter((tag) => tag) : [];

      // Build product data - only include fields that have values
      const productData: productApi.UpdateProductData = {
        name: productName.trim(),
        price: Number(priceValue),
        stock: Number(stockValue),
        isActive: Boolean(isActive),
      };

      // Add optional fields only if they have values
      if (description && description.trim()) {
        productData.description = description.trim();
      }
      if (sku && sku.trim()) {
        productData.sku = sku.trim();
      }
      if (discountPriceValue !== null && !isNaN(discountPriceValue)) {
        productData.discountPrice = Number(discountPriceValue);
      }
      if (category && category.trim()) {
        productData.category = category.trim();
      }
      if (subCategory && subCategory.trim()) {
        productData.subCategory = subCategory.trim();
      }
      if (tagsArray.length > 0) {
        productData.tags = tagsArray;
      }
      // Only include images if we have new ones or existing ones
      if (fullImageUrls.length > 0 || imageFiles.length > 0) {
        productData.images = fullImageUrls;
      }

      updateProductMutation.mutate(productData);
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Edit product (image upload) error:', {
          message: error?.message,
          code: error?.code,
          response: error?.response?.data,
          status: error?.response?.status,
        });
      }
      const isNetworkError = error?.code === 'ERR_NETWORK' || !error?.response;
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: isNetworkError
          ? t('pharmacyAdmin.products.edit.errors.imageUploadFailed')
          : error?.response?.data?.message || error?.message || t('pharmacyAdmin.products.edit.errors.failedToUploadImages'),
      });
    } finally {
      if (tempFileUris.length > 0) {
        deleteCacheFiles(tempFileUris).catch(() => {});
      }
    }
  };

  if (productLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.products.edit.loadingProduct')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Product Name */}
          <Input
            label={t('pharmacyAdmin.products.edit.form.productNameLabel')}
            placeholder={t('pharmacyAdmin.products.edit.form.productNamePlaceholder')}
            value={productName}
            onChangeText={setProductName}
          />

          {/* SKU */}
          <Input
            label={t('pharmacyAdmin.products.edit.form.skuLabel')}
            placeholder={t('pharmacyAdmin.products.edit.form.skuPlaceholder')}
            value={sku}
            onChangeText={setSku}
          />

          {/* Price and Stock */}
          <View style={styles.row}>
            <Input
              label={t('pharmacyAdmin.products.edit.form.priceLabel')}
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
            <Input
              label={t('pharmacyAdmin.products.edit.form.stockLabel')}
              placeholder="0"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>

          {/* Discount Price */}
          <Input
            label={t('pharmacyAdmin.products.edit.form.discountPriceLabel')}
            placeholder={t('pharmacyAdmin.products.edit.form.discountPricePlaceholder')}
            value={discountPrice}
            onChangeText={setDiscountPrice}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.edit.form.categoryLabel')}</Text>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.pickerWrapper}
                  onPress={() => setCategoryMenuVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, !category && styles.pickerPlaceholder]}>
                    {category || t('pharmacyAdmin.products.edit.form.categoryPlaceholder')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              }
            >
              {categories.map((cat, index) => (
                <Menu.Item
                  key={index}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryMenuVisible(false);
                  }}
                  title={t(`pharmacyAdmin.products.categories.${cat}` as any, { defaultValue: cat })}
                />
              ))}
            </Menu>
          </View>

          {/* Sub Category */}
          <Input
            label={t('pharmacyAdmin.products.edit.form.subCategoryLabel')}
            placeholder={t('pharmacyAdmin.products.edit.form.subCategoryPlaceholder')}
            value={subCategory}
            onChangeText={setSubCategory}
          />

          {/* Description */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.edit.form.descriptionLabel')}</Text>
            <View style={styles.textAreaWrapper}>
              <Input
                placeholder={t('pharmacyAdmin.products.edit.form.descriptionPlaceholder')}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                style={styles.textArea}
              />
            </View>
          </View>

          {/* Tags */}
          <Input
            label={t('pharmacyAdmin.products.edit.form.tagsLabel')}
            placeholder={t('pharmacyAdmin.products.edit.form.tagsPlaceholder')}
            value={tags}
            onChangeText={setTags}
          />

          {/* Product Images */}
          <View style={styles.imagesSection}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.edit.form.imagesLabel')}</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>{t('pharmacyAdmin.products.edit.actions.uploadImages')}</Text>
              <Text style={styles.uploadHint}>{t('pharmacyAdmin.products.edit.hints.multipleImages')}</Text>
            </TouchableOpacity>

            {/* Existing Images */}
            {productImages.length > 0 && (
              <View style={styles.imagesGrid}>
                {productImages.map((img, index) => {
                  const normalizedUrl = normalizeImageUrl(img);
                  return (
                    <View key={`existing-${index}`} style={styles.imageContainer}>
                      <Image source={{ uri: normalizedUrl }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* New Images */}
            {imageFiles.length > 0 && (
              <View style={styles.imagesGrid}>
                {imageFiles.map((asset, index) => (
                  <View key={`new-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: asset.uri }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeNewImage(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Active Status */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.edit.form.activeLabel')}</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title={updateProductMutation.isPending ? t('pharmacyAdmin.products.edit.actions.updating') : t('common.saveChanges')}
          onPress={handleSubmit}
          loading={updateProductMutation.isPending}
        />
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textLight,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  textAreaContainer: {
    marginBottom: 8,
  },
  textAreaWrapper: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  imagesSection: {
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
