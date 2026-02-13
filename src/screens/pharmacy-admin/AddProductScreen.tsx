import React, { useState, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ProductsStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import * as productApi from '../../services/product';
import * as pharmacyApi from '../../services/pharmacy';
import * as pharmacySubscriptionApi from '../../services/pharmacySubscription';
import * as uploadApi from '../../services/upload';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';
import { copyImageToCacheUri, deleteCacheFiles } from '../../utils/imageUpload';
import { useTranslation } from 'react-i18next';

type AddProductScreenNavigationProp = NativeStackNavigationProp<ProductsStackParamList>;

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

export const AddProductScreen = () => {
  const navigation = useNavigation<AddProductScreenNavigationProp>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isPharmacy = user?.role === 'pharmacy' || (user as any)?.role === 'PHARMACY';
  const isParapharmacy = user?.role === 'parapharmacy' || (user as any)?.role === 'PARAPHARMACY';
  const isPharmacyOrParaUser = isPharmacy || isParapharmacy;
  const requiresSubscription = isPharmacy;
  const isApproved = String((user as any)?.status || user?.status || '').toUpperCase() === 'APPROVED';
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
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [pharmacyFormData, setPharmacyFormData] = useState({
    name: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      zip: '',
    },
    location: {
      lat: '',
      lng: '',
    },
  });

  // Get user ID
  const userId = user?._id || user?.id;

  const { data: myPharmacyResponse, refetch: refetchMyPharmacy } = useQuery({
    queryKey: ['my-pharmacy', userId],
    queryFn: () => pharmacyApi.getMyPharmacy(),
    enabled: !!userId && isPharmacyOrParaUser,
  });

  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-pharmacy-subscription', userId],
    queryFn: () => pharmacySubscriptionApi.getMyPharmacySubscription(),
    enabled: !!userId && requiresSubscription,
    retry: 1,
  });

  const subscriptionData = useMemo(() => {
    if (!subscriptionResponse) return null;
    const r: any = subscriptionResponse as any;
    const data = r?.data ?? r;
    return data?.data ?? data;
  }, [subscriptionResponse]);

  const hasActiveSubscription = useMemo(() => {
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

  const myPharmacy = useMemo(() => {
    const responseData = (myPharmacyResponse as any)?.data || myPharmacyResponse;
    return responseData?.data || responseData || null;
  }, [myPharmacyResponse]);

  const isProfileComplete = useMemo(() => {
    if (!myPharmacy) return false;
    return !!(
      myPharmacy.name &&
      myPharmacy.phone &&
      myPharmacy.address &&
      myPharmacy.address.line1 &&
      myPharmacy.address.city
    );
  }, [myPharmacy]);

  const goToPharmacyProfile = () => {
    const parent = (navigation as any).getParent?.();
    if (parent) {
      parent.navigate('More', { screen: 'PharmacyProfile' });
    } else {
      (navigation as any).navigate('More', { screen: 'PharmacyProfile' });
    }
  };

  if (isPharmacyOrParaUser && !isApproved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="time-outline" size={54} color={colors.warning} />
          <Text style={{ marginTop: 12, fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('pharmacyAdmin.products.add.gates.pendingApprovalTitle')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
            {t('pharmacyAdmin.products.add.gates.pendingApprovalBody')}
          </Text>
          <Button title={t('common.goBack')} onPress={() => navigation.goBack()} style={{ marginTop: 16, width: '100%' }} />
        </View>
      </SafeAreaView>
    );
  }

  if (isPharmacyOrParaUser && myPharmacy && !isProfileComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="warning-outline" size={54} color={colors.warning} />
          <Text style={{ marginTop: 12, fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('pharmacyAdmin.products.add.gates.completeProfileTitle')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
            {t('pharmacyAdmin.products.add.gates.completeProfileBody')}
          </Text>
          <Button
            title={t('pharmacyAdmin.products.add.actions.completePharmacyProfile')}
            onPress={goToPharmacyProfile}
            style={{ marginTop: 16, width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (requiresSubscription && subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary }}>
            {t('pharmacyAdmin.dashboard.banners.loadingSubscription')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (requiresSubscription && !subscriptionLoading && !hasActiveSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="card-outline" size={54} color={colors.warning} />
          <Text style={{ marginTop: 12, fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('pharmacyAdmin.products.add.gates.subscriptionRequiredTitle')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
            {t('pharmacyAdmin.products.add.gates.subscriptionRequiredBody')}
          </Text>
          <Button
            title={t('pharmacyAdmin.orders.actions.viewSubscriptionPlans')}
            onPress={goToSubscription}
            style={{ marginTop: 16, width: '100%' }}
          />
          <Button title={t('common.goBack')} onPress={() => navigation.goBack()} style={{ marginTop: 10, width: '100%' }} />
        </View>
      </SafeAreaView>
    );
  }

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: productApi.CreateProductData) => productApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('pharmacyAdmin.products.add.toasts.productCreated'),
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      let errorMessage = t('pharmacyAdmin.products.add.errors.failedToCreateProduct');
      
      // Handle 403 Forbidden - Subscription related errors
      if (error?.response?.status === 403) {
        const errorData = error.response.data || {};
        if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = t('pharmacyAdmin.products.add.errors.fullSubscriptionRequired');
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  // Create pharmacy mutation
  const createPharmacyMutation = useMutation({
    mutationFn: (data: pharmacyApi.CreatePharmacyData) => pharmacyApi.createPharmacy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy'] });
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('pharmacyAdmin.products.add.toasts.pharmacyCreated'),
      });
      setShowPharmacyModal(false);
      setPharmacyFormData({
        name: '',
        phone: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: '',
          zip: '',
        },
        location: {
          lat: '',
          lng: '',
        },
      });
      refetchMyPharmacy();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || t('pharmacyAdmin.products.add.errors.failedToCreatePharmacy');
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: errorMessage,
      });
    },
  });

  /**
   * Derive MIME type and filename for FormData.
   * Expo returns type as 'image'|'video', but backend expects image/jpeg, image/png, etc.
   */
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
        text2: t('pharmacyAdmin.products.add.errors.failedToPickImage'),
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleCreatePharmacy = async () => {
    if (!pharmacyFormData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('pharmacyAdmin.products.add.validation.enterPharmacyName'),
      });
      return;
    }

    // Clean up the data - only include fields that have values
    const cleanedData: pharmacyApi.CreatePharmacyData = {
      name: pharmacyFormData.name.trim(),
    };

    if (pharmacyFormData.phone && pharmacyFormData.phone.trim()) {
      cleanedData.phone = pharmacyFormData.phone.trim();
    }

    // Clean address - only include non-empty fields
    const addressFields: any = {};
    if (pharmacyFormData.address.line1?.trim()) addressFields.line1 = pharmacyFormData.address.line1.trim();
    if (pharmacyFormData.address.line2?.trim()) addressFields.line2 = pharmacyFormData.address.line2.trim();
    if (pharmacyFormData.address.city?.trim()) addressFields.city = pharmacyFormData.address.city.trim();
    if (pharmacyFormData.address.state?.trim()) addressFields.state = pharmacyFormData.address.state.trim();
    if (pharmacyFormData.address.country?.trim()) addressFields.country = pharmacyFormData.address.country.trim();
    if (pharmacyFormData.address.zip?.trim()) addressFields.zip = pharmacyFormData.address.zip.trim();
    
    if (Object.keys(addressFields).length > 0) {
      cleanedData.address = addressFields;
    }

    // Clean location - only include if both lat and lng are valid numbers
    if (pharmacyFormData.location.lat && pharmacyFormData.location.lng) {
      const lat = parseFloat(pharmacyFormData.location.lat);
      const lng = parseFloat(pharmacyFormData.location.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        cleanedData.location = { lat, lng };
      }
    }

    createPharmacyMutation.mutate(cleanedData);
  };

  const handleSubmit = async () => {
    // Check if doctor has a pharmacy
    if (!myPharmacy) {
      setShowPharmacyModal(true);
      Toast.show({
        type: 'info',
        text1: t('pharmacyAdmin.products.toasts.pharmacyRequiredTitle'),
        text2: t('pharmacyAdmin.products.toasts.pharmacyRequiredBody'),
      });
      return;
    }

    // Validate required fields
    if (!productName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('common.required'),
        text2: t('pharmacyAdmin.products.add.validation.productNameRequired'),
      });
      return;
    }

    // Validate price
    const priceValue = price ? parseFloat(price) : null;
    if (priceValue === null || isNaN(priceValue) || priceValue < 0) {
      Toast.show({
        type: 'error',
        text1: t('pharmacyAdmin.products.add.validation.invalidPriceTitle'),
        text2: t('pharmacyAdmin.products.add.validation.invalidPriceBody'),
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
            text1: t('pharmacyAdmin.products.add.validation.invalidStockTitle'),
            text2: t('pharmacyAdmin.products.add.validation.invalidStockBody'),
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
            text1: t('pharmacyAdmin.products.add.validation.invalidDiscountTitle'),
            text2: t('pharmacyAdmin.products.add.validation.invalidDiscountNonNegativeBody'),
          });
          return;
        }
        if (discountPriceValue >= priceValue) {
          Toast.show({
            type: 'error',
            text1: t('pharmacyAdmin.products.add.validation.invalidDiscountTitle'),
            text2: t('pharmacyAdmin.products.add.validation.invalidDiscountLessThanPriceBody'),
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

      // Build product data
      const productData: productApi.CreateProductData = {
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
      if (fullImageUrls.length > 0) {
        productData.images = fullImageUrls;
      }

      createProductMutation.mutate(productData);
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Add product error:', {
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
          ? t('pharmacyAdmin.products.add.errors.imageUploadFailed')
          : error?.response?.data?.message || error?.message || t('pharmacyAdmin.products.add.errors.failedToUploadImages'),
      });
    } finally {
      if (tempFileUris.length > 0) {
        deleteCacheFiles(tempFileUris).catch(() => {});
      }
    }
  };

  return (
    !isPharmacyOrParaUser ? (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>{t('pharmacyAdmin.common.pharmacyAccountsOnly')}</Text>
        </View>
      </SafeAreaView>
    ) :
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pharmacy Info Banner */}
        {myPharmacy ? (
          <View style={styles.pharmacyBanner}>
            <Ionicons name="storefront" size={20} color={colors.success} />
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyName}>{t('pharmacyAdmin.products.pharmacyBanner.yourPharmacy', { name: myPharmacy.name })}</Text>
              {(myPharmacy as any).address?.city && (
                <Text style={styles.pharmacyLocation}>{(myPharmacy as any).address.city}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.pharmacyWarningBanner}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyWarningText}>{t('pharmacyAdmin.products.pharmacyBanner.noPharmacyFoundTitle')}</Text>
              <Text style={styles.pharmacyWarningSubtext}>
                {t('pharmacyAdmin.products.pharmacyBanner.noPharmacyFoundBody')}
              </Text>
              <TouchableOpacity
                style={styles.createPharmacyButton}
                onPress={() => {
                  setShowPharmacyModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.createPharmacyButtonText}>{t('pharmacyAdmin.products.add.actions.createPharmacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.form}>
          {/* Product Name */}
          <Input
            label={t('pharmacyAdmin.products.add.form.productNameLabel')}
            placeholder={t('pharmacyAdmin.products.add.form.productNamePlaceholder')}
            value={productName}
            onChangeText={setProductName}
          />

          {/* SKU */}
          <Input
            label={t('pharmacyAdmin.products.add.form.skuLabel')}
            placeholder={t('pharmacyAdmin.products.add.form.skuPlaceholder')}
            value={sku}
            onChangeText={setSku}
          />

          {/* Price and Stock */}
          <View style={styles.row}>
            <Input
              label={t('pharmacyAdmin.products.add.form.priceLabel')}
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
            <Input
              label={t('pharmacyAdmin.products.add.form.stockLabel')}
              placeholder="0"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>

          {/* Discount Price */}
          <Input
            label={t('pharmacyAdmin.products.add.form.discountPriceLabel')}
            placeholder={t('pharmacyAdmin.products.add.form.discountPricePlaceholder')}
            value={discountPrice}
            onChangeText={setDiscountPrice}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.add.form.categoryLabel')}</Text>
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
                    {category || t('pharmacyAdmin.products.add.form.categoryPlaceholder')}
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
            label={t('pharmacyAdmin.products.add.form.subCategoryLabel')}
            placeholder={t('pharmacyAdmin.products.add.form.subCategoryPlaceholder')}
            value={subCategory}
            onChangeText={setSubCategory}
          />

          {/* Description */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.add.form.descriptionLabel')}</Text>
            <View style={styles.textAreaWrapper}>
              <Input
                placeholder={t('pharmacyAdmin.products.add.form.descriptionPlaceholder')}
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
            label={t('pharmacyAdmin.products.add.form.tagsLabel')}
            placeholder={t('pharmacyAdmin.products.add.form.tagsPlaceholder')}
            value={tags}
            onChangeText={setTags}
          />

          {/* Product Images */}
          <View style={styles.imagesSection}>
            <Text style={styles.label}>{t('pharmacyAdmin.products.add.form.imagesLabel')}</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>{t('pharmacyAdmin.products.add.actions.uploadImages')}</Text>
              <Text style={styles.uploadHint}>{t('pharmacyAdmin.products.add.hints.multipleImages')}</Text>
            </TouchableOpacity>

            {imageFiles.length > 0 && (
              <View style={styles.imagesGrid}>
                {imageFiles.map((asset, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: asset.uri }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
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
            <Text style={styles.label}>{t('pharmacyAdmin.products.add.form.activeLabel')}</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title={createProductMutation.isPending ? t('pharmacyAdmin.products.add.actions.creating') : t('pharmacyAdmin.products.add.actions.createProduct')}
          onPress={handleSubmit}
          loading={createProductMutation.isPending}
          disabled={!myPharmacy || createProductMutation.isPending}
        />
      </View>

      {/* Pharmacy Creation Modal */}
      {showPharmacyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pharmacyAdmin.products.add.modal.title')}</Text>
              <TouchableOpacity onPress={() => setShowPharmacyModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  {t('pharmacyAdmin.products.add.modal.info')}
                </Text>
              </View>
              <Input
                label={t('pharmacyAdmin.products.add.modal.pharmacyNameLabel')}
                placeholder={t('pharmacyAdmin.products.add.modal.pharmacyNamePlaceholder')}
                value={pharmacyFormData.name}
                onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, name: text })}
              />
              <Input
                label={t('pharmacyAdmin.products.add.modal.phoneLabel')}
                placeholder={t('pharmacyAdmin.products.add.modal.phonePlaceholder')}
                value={pharmacyFormData.phone}
                onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, phone: text })}
                keyboardType="phone-pad"
              />
              <Input
                label={t('pharmacyAdmin.products.add.modal.addressLine1Label')}
                placeholder={t('pharmacyAdmin.products.add.modal.addressLine1Placeholder')}
                value={pharmacyFormData.address.line1}
                onChangeText={(text) =>
                  setPharmacyFormData({
                    ...pharmacyFormData,
                    address: { ...pharmacyFormData.address, line1: text },
                  })
                }
              />
              <Input
                label={t('pharmacyAdmin.products.add.modal.addressLine2Label')}
                placeholder={t('pharmacyAdmin.products.add.modal.addressLine2Placeholder')}
                value={pharmacyFormData.address.line2}
                onChangeText={(text) =>
                  setPharmacyFormData({
                    ...pharmacyFormData,
                    address: { ...pharmacyFormData.address, line2: text },
                  })
                }
              />
              <View style={styles.row}>
                <Input
                  label={t('pharmacyAdmin.products.add.modal.cityLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.cityPlaceholder')}
                  value={pharmacyFormData.address.city}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      address: { ...pharmacyFormData.address, city: text },
                    })
                  }
                  style={styles.halfInput}
                />
                <Input
                  label={t('pharmacyAdmin.products.add.modal.stateLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.statePlaceholder')}
                  value={pharmacyFormData.address.state}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      address: { ...pharmacyFormData.address, state: text },
                    })
                  }
                  style={styles.halfInput}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label={t('pharmacyAdmin.products.add.modal.countryLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.countryPlaceholder')}
                  value={pharmacyFormData.address.country}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      address: { ...pharmacyFormData.address, country: text },
                    })
                  }
                  style={styles.halfInput}
                />
                <Input
                  label={t('pharmacyAdmin.products.add.modal.zipLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.zipPlaceholder')}
                  value={pharmacyFormData.address.zip}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      address: { ...pharmacyFormData.address, zip: text },
                    })
                  }
                  style={styles.halfInput}
                />
              </View>
              <View style={styles.row}>
                <Input
                  label={t('pharmacyAdmin.products.add.modal.latitudeLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.latitudePlaceholder')}
                  value={pharmacyFormData.location.lat}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      location: { ...pharmacyFormData.location, lat: text },
                    })
                  }
                  keyboardType="decimal-pad"
                  style={styles.halfInput}
                />
                <Input
                  label={t('pharmacyAdmin.products.add.modal.longitudeLabel')}
                  placeholder={t('pharmacyAdmin.products.add.modal.longitudePlaceholder')}
                  value={pharmacyFormData.location.lng}
                  onChangeText={(text) =>
                    setPharmacyFormData({
                      ...pharmacyFormData,
                      location: { ...pharmacyFormData.location, lng: text },
                    })
                  }
                  keyboardType="decimal-pad"
                  style={styles.halfInput}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPharmacyModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Button
                title={createPharmacyMutation.isPending ? t('pharmacyAdmin.products.add.actions.creating') : t('pharmacyAdmin.products.add.actions.createPharmacy')}
                onPress={handleCreatePharmacy}
                loading={createPharmacyMutation.isPending}
                style={styles.modalCreateButton}
              />
            </View>
          </View>
        </View>
      )}
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
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
    backgroundColor: colors.warningLight,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
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
    marginBottom: 4,
  },
  pharmacyWarningSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  createPharmacyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createPharmacyButtonText: {
    color: colors.textWhite,
    fontWeight: '600',
    fontSize: 12,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    maxHeight: 400,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalCreateButton: {
    flex: 1,
  },
});
