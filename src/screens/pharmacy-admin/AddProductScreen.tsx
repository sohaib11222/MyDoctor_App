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
import * as uploadApi from '../../services/upload';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../../config/api';

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
  const queryClient = useQueryClient();
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

  // Fetch doctor's pharmacy (if exists)
  const { data: doctorPharmacyResponse, refetch: refetchPharmacy } = useQuery({
    queryKey: ['doctor-pharmacy', userId],
    queryFn: () => pharmacyApi.listPharmacies({ ownerId: userId!, limit: 1 }),
    enabled: !!userId,
  });

  const doctorPharmacy = useMemo(() => {
    if (!doctorPharmacyResponse) return null;
    const responseData = doctorPharmacyResponse.data || doctorPharmacyResponse;
    const pharmacies = Array.isArray(responseData) ? responseData : (responseData.pharmacies || []);
    return pharmacies.length > 0 ? pharmacies[0] : null;
  }, [doctorPharmacyResponse]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: productApi.CreateProductData) => productApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-products'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product created successfully!',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create product';
      
      // Handle 403 Forbidden - Subscription related errors
      if (error?.response?.status === 403) {
        const errorData = error.response.data || {};
        if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = 'You need an active FULL subscription plan to create products. Please upgrade your subscription plan.';
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  // Create pharmacy mutation
  const createPharmacyMutation = useMutation({
    mutationFn: (data: pharmacyApi.CreatePharmacyData) => pharmacyApi.createPharmacy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pharmacy'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Pharmacy created successfully!',
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
      refetchPharmacy();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create pharmacy';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions.');
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
        text1: 'Error',
        text2: 'Failed to pick image',
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
        text1: 'Error',
        text2: 'Please enter pharmacy name',
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
    if (!doctorPharmacy) {
      // Navigate to PharmacyManagementScreen in MoreStack
      const parentNavigation = navigation.getParent();
      if (parentNavigation) {
        parentNavigation.navigate('More', { screen: 'PharmacyManagement' });
      } else {
        // Fallback: try direct navigation
        (navigation as any).navigate('More', { screen: 'PharmacyManagement' });
      }
      Toast.show({
        type: 'info',
        text1: 'Pharmacy Required',
        text2: 'Please create a pharmacy first before adding products',
      });
      return;
    }

    // Validate required fields
    if (!productName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Required',
        text2: 'Product name is required',
      });
      return;
    }

    // Validate price
    const priceValue = price ? parseFloat(price) : null;
    if (priceValue === null || isNaN(priceValue) || priceValue < 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Price',
        text2: 'Please enter a valid price (must be a number >= 0)',
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
            text1: 'Invalid Stock',
            text2: 'Stock must be a non-negative integer',
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
            text1: 'Invalid Discount',
            text2: 'Discount price must be a non-negative number',
          });
          return;
        }
        if (discountPriceValue >= priceValue) {
          Toast.show({
            type: 'error',
            text1: 'Invalid Discount',
            text2: 'Discount price must be less than regular price',
          });
          return;
        }
      }
    }

    try {
      let imageUrls = [...productImages];

      // Upload new images if files selected
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((asset) => {
          formData.append('files', {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `product-${Date.now()}.jpg`,
          } as any);
        });

        const uploadedUrls = await uploadApi.uploadProductImages(formData);
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to upload images',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pharmacy Info Banner */}
        {doctorPharmacy ? (
          <View style={styles.pharmacyBanner}>
            <Ionicons name="storefront" size={20} color={colors.success} />
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyName}>Your Pharmacy: {doctorPharmacy.name}</Text>
              {doctorPharmacy.address?.city && (
                <Text style={styles.pharmacyLocation}>{doctorPharmacy.address.city}</Text>
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
              <TouchableOpacity
                style={styles.createPharmacyButton}
                onPress={() => {
                  // Navigate to PharmacyManagementScreen in MoreStack
                  const parentNavigation = navigation.getParent();
                  if (parentNavigation) {
                    parentNavigation.navigate('More', { screen: 'PharmacyManagement' });
                  } else {
                    // Fallback: try direct navigation
                    (navigation as any).navigate('More', { screen: 'PharmacyManagement' });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.createPharmacyButtonText}>Create Pharmacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.form}>
          {/* Product Name */}
          <Input
            label="Product Name *"
            placeholder="Enter product name"
            value={productName}
            onChangeText={setProductName}
          />

          {/* SKU */}
          <Input
            label="SKU"
            placeholder="Product SKU (optional)"
            value={sku}
            onChangeText={setSku}
          />

          {/* Price and Stock */}
          <View style={styles.row}>
            <Input
              label="Price *"
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
            <Input
              label="Stock"
              placeholder="0"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>

          {/* Discount Price */}
          <Input
            label="Discount Price"
            placeholder="0.00 (optional)"
            value={discountPrice}
            onChangeText={setDiscountPrice}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Category</Text>
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
                    {category || 'Select Category (optional)'}
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
                  title={cat}
                />
              ))}
            </Menu>
          </View>

          {/* Sub Category */}
          <Input
            label="Sub Category"
            placeholder="Product sub category (optional)"
            value={subCategory}
            onChangeText={setSubCategory}
          />

          {/* Description */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={styles.textAreaWrapper}>
              <Input
                placeholder="Enter product description (optional)"
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
            label="Tags (comma-separated)"
            placeholder="tag1, tag2, tag3 (optional)"
            value={tags}
            onChangeText={setTags}
          />

          {/* Product Images */}
          <View style={styles.imagesSection}>
            <Text style={styles.label}>Product Images</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Images</Text>
              <Text style={styles.uploadHint}>You can select multiple images</Text>
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
            <Text style={styles.label}>Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title={createProductMutation.isPending ? 'Creating...' : 'Create Product'}
          onPress={handleSubmit}
          loading={createProductMutation.isPending}
          disabled={!doctorPharmacy || createProductMutation.isPending}
        />
      </View>

      {/* Pharmacy Creation Modal */}
      {showPharmacyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Your Pharmacy</Text>
              <TouchableOpacity onPress={() => setShowPharmacyModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  You need to create a pharmacy before adding products. All your products will be automatically linked to this pharmacy.
                </Text>
              </View>
              <Input
                label="Pharmacy Name *"
                placeholder="Enter pharmacy name"
                value={pharmacyFormData.name}
                onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, name: text })}
              />
              <Input
                label="Phone"
                placeholder="Enter phone number (optional)"
                value={pharmacyFormData.phone}
                onChangeText={(text) => setPharmacyFormData({ ...pharmacyFormData, phone: text })}
                keyboardType="phone-pad"
              />
              <Input
                label="Address Line 1"
                placeholder="Street address (optional)"
                value={pharmacyFormData.address.line1}
                onChangeText={(text) =>
                  setPharmacyFormData({
                    ...pharmacyFormData,
                    address: { ...pharmacyFormData.address, line1: text },
                  })
                }
              />
              <Input
                label="Address Line 2"
                placeholder="Apartment, suite, etc. (optional)"
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
                  label="City"
                  placeholder="City (optional)"
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
                  label="State"
                  placeholder="State (optional)"
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
                  label="Country"
                  placeholder="Country (optional)"
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
                  label="ZIP Code"
                  placeholder="ZIP code (optional)"
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
                  label="Latitude"
                  placeholder="Latitude (optional)"
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
                  label="Longitude"
                  placeholder="Longitude (optional)"
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
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title={createPharmacyMutation.isPending ? 'Creating...' : 'Create Pharmacy'}
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
