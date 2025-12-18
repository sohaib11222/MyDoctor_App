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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ProductsStackParamList } from '../../navigation/types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';

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

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [discount, setDiscount] = useState('');
  const [description, setDescription] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch product data based on productId
    // For now, populate with mock data
    setProductName('Benzaxapine Croplex');
    setCategory('Family Care');
    setPrice('$19.00');
    setQuantity('50');
    setDiscount('10');
    setDescription('Safi syrup is best for purifying the blood. As it contains herbal extracts it can cure indigestion, constipation, nose bleeds and acne boils.');
    setProductImages([require('../../../assets/avatar.png').toString()]);
  }, [productId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => asset.uri);
        setProductImages([...productImages, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!productName.trim()) {
      Alert.alert('Required', 'Product name is required.');
      return;
    }
    if (!category) {
      Alert.alert('Required', 'Category is required.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Required', 'Price is required.');
      return;
    }
    if (!quantity.trim()) {
      Alert.alert('Required', 'Quantity is required.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Description is required.');
      return;
    }

    setLoading(true);
    // TODO: Submit to backend
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Product updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Product Name */}
          <Input
            label="Product Name *"
            placeholder="Enter product name"
            value={productName}
            onChangeText={setProductName}
          />

          {/* Category */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Category *</Text>
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
                    {category || 'Select Category'}
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

          {/* Price and Quantity */}
          <View style={styles.row}>
            <Input
              label="Price *"
              placeholder="$0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
            <Input
              label="Quantity *"
              placeholder="0"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>

          {/* Discount */}
          <Input
            label="Discount *"
            placeholder="Enter discount percentage"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
          />

          {/* Description */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>Description *</Text>
            <View style={styles.textAreaWrapper}>
              <Input
                placeholder="Enter product description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                style={styles.textArea}
              />
            </View>
          </View>

          {/* Product Images */}
          <View style={styles.imagesSection}>
            <Text style={styles.label}>Upload Product Images *</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Images</Text>
              <Text style={styles.uploadHint}>You can select multiple images</Text>
            </TouchableOpacity>

            {productImages.length > 0 && (
              <View style={styles.imagesGrid}>
                {productImages.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image
                      source={typeof uri === 'string' ? { uri } : require('../../../assets/avatar.png')}
                      style={styles.uploadedImage}
                    />
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
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button title="Save Changes" onPress={handleSubmit} loading={loading} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
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
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

