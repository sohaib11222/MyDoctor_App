import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';

type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList, 'ProductDetails'>;
type ProductDetailsRouteProp = RouteProp<PharmacyStackParamList, 'ProductDetails'>;

const { width } = Dimensions.get('window');

export const ProductDetailsScreen = () => {
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const route = useRoute<ProductDetailsRouteProp>();
  const { productId } = route.params;
  const [quantity, setQuantity] = useState(10);

  // Mock product data - in real app, fetch based on productId
  const product = {
    id: productId,
    name: 'Benzaxapine Croplex',
    manufacturer: 'Hamdard (Wakf) Laboratories',
    price: '$19',
    originalPrice: '$45',
    discount: '10% off',
    inStock: true,
    image: require('../../../assets/avatar.png'),
    sku: '2023-02-0057',
    packSize: '100g',
    unitCount: '200ml',
    country: 'Japan',
    description: 'Safi syrup is best for purifying the blood. As it contains herbal extracts it can cure indigestion, constipation, nose bleeds and acne boils. It helps in the removal of the toxins from the blood. It improves the complexion and gives you a healthy life',
    highlights: [
      'Safi syrup is known for its best purifying syrup for blood.',
      'It helps in eliminating the toxins from the bloodstream.',
      'It improves digestion.',
    ],
    directions: 'Adults: Take 2 tablespoons once a day in a glass full of water.',
    storage: 'Store this syrup at room temperature protected from sunlight, heat, and moisture. Keep away from reaching out of children and pets. Ensure that the unused medicine is disposed of properly.',
    appliedFor: [
      'Moisturization & Nourishment',
      'Blackhead Removal',
      'Anti-acne & Pimples',
      'Whitening & Fairness',
    ],
  };

  const increaseQuantity = () => setQuantity((prev) => prev + 1);
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image and Basic Info */}
        <View style={styles.productHeader}>
          <Image source={product.image} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.manufacturer}>
              <Text style={styles.manufacturerLabel}>Manufactured By </Text>
              {product.manufacturer}
            </Text>
            <Text style={styles.description}>{product.description}</Text>

            {/* Applied For */}
            <View style={styles.appliedForSection}>
              <Text style={styles.appliedForTitle}>Applied for:</Text>
              {product.appliedFor.map((item, index) => (
                <View key={index} style={styles.appliedForItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.appliedForText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.detailItem}>
            <Text style={styles.detailTitle}>Description</Text>
            <Text style={styles.detailText}>{product.description}</Text>
          </View>

          {/* Highlights */}
          <View style={styles.detailItem}>
            <Text style={styles.detailTitle}>Highlights</Text>
            {product.highlights.map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>

          {/* Directions */}
          <View style={styles.detailItem}>
            <Text style={styles.detailTitle}>Directions for use</Text>
            <Text style={styles.detailText}>{product.directions}</Text>
          </View>

          {/* Storage */}
          <View style={styles.detailItem}>
            <Text style={styles.detailTitle}>Storage</Text>
            <Text style={styles.detailText}>{product.storage}</Text>
          </View>
        </View>

        {/* Product Specifications Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{product.price}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>{product.originalPrice}</Text>
              )}
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>In stock</Text>
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decreaseQuantity}
                >
                  <Ionicons name="remove" size={18} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={increaseQuantity}
                >
                  <Ionicons name="add" size={18} color={colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Add to Cart Button */}
            <Button
              title="Add To Cart"
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />

            {/* Product Specs */}
            <View style={styles.specsCard}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>SKU</Text>
                <Text style={styles.specValue}>{product.sku}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Pack Size</Text>
                <Text style={styles.specValue}>{product.packSize}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Unit Count</Text>
                <Text style={styles.specValue}>{product.unitCount}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Country</Text>
                <Text style={styles.specValue}>{product.country}</Text>
              </View>
            </View>

            {/* Benefits Card */}
            <View style={styles.benefitsCard}>
              <View style={styles.benefitItem}>
                <Ionicons name="car" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Free Shipping</Text>
                  <Text style={styles.benefitSubtitle}>For orders from $50</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="help-circle" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Support 24/7</Text>
                  <Text style={styles.benefitSubtitle}>Call us anytime</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>100% Safety</Text>
                  <Text style={styles.benefitSubtitle}>Only secure payments</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="pricetag" size={20} color={colors.primary} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Hot Offers</Text>
                  <Text style={styles.benefitSubtitle}>Discounts up to 90%</Text>
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
    marginBottom: 16,
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

