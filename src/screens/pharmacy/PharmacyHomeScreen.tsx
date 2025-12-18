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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PharmacyStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PharmacyHomeScreenNavigationProp = NativeStackNavigationProp<PharmacyStackParamList>;

const { width } = Dimensions.get('window');

const deals = [
  { id: 1, name: 'Diabetes', image: require('../../../assets/avatar.png') },
  { id: 2, name: 'Cardiac Care', image: require('../../../assets/avatar.png') },
  { id: 3, name: 'Stomach Care', image: require('../../../assets/avatar.png') },
  { id: 4, name: 'Ayurvedic', image: require('../../../assets/avatar.png') },
  { id: 5, name: 'Homeopathy', image: require('../../../assets/avatar.png') },
  { id: 6, name: 'Fitness', image: require('../../../assets/avatar.png') },
  { id: 7, name: 'Mom & Baby', image: require('../../../assets/avatar.png') },
  { id: 8, name: 'Devices', image: require('../../../assets/avatar.png') },
];

const categories = [
  { id: 1, name: 'Ayush', products: '400 Products', image: require('../../../assets/avatar.png') },
  { id: 2, name: 'Covid Essentials', products: '924 Products', image: require('../../../assets/avatar.png') },
  { id: 3, name: 'Devices', products: '450 Products', image: require('../../../assets/avatar.png') },
  { id: 4, name: 'Fitness', products: '350 Products', image: require('../../../assets/avatar.png') },
  { id: 5, name: 'Mom & Baby', products: '280 Products', image: require('../../../assets/avatar.png') },
  { id: 6, name: 'Personal Care', products: '520 Products', image: require('../../../assets/avatar.png') },
];

const products = [
  { id: 1, name: 'Benzaxapine Croplex', price: '$19.00', originalPrice: '$45.00', image: require('../../../assets/avatar.png') },
  { id: 2, name: 'Rapalac Neuronium', price: '$16.00', image: require('../../../assets/avatar.png') },
  { id: 3, name: 'Ombinazol Bonibamol', price: '$22.00', image: require('../../../assets/avatar.png') },
  { id: 4, name: 'Dantotate Dantodazole', price: '$10.00', originalPrice: '$12.00', image: require('../../../assets/avatar.png') },
];

const promotionalCards = [
  {
    id: 1,
    title: '10% Cashback on Dietary',
    titleHighlight: 'Suppliments',
    code: 'CARE12',
    image: require('../../../assets/avatar.png'),
  },
  {
    id: 2,
    title: 'Say yes',
    titleHighlight: 'to New Throat Freshner',
    subtitle: 'Refresh your day the fruity way',
    image: require('../../../assets/avatar.png'),
  },
  {
    id: 3,
    title: 'Get a Product Worth',
    titleHighlight: '1000',
    subtitle: 'in a Pack',
    code: 'CARE12',
    image: require('../../../assets/avatar.png'),
  },
];

export const PharmacyHomeScreen = () => {
  const navigation = useNavigation<PharmacyHomeScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>From the Leading Online Pharmacy</Text>
            <Text style={styles.bannerSubtitle}>& Healthcare Platform Company</Text>
            <Text style={styles.bannerDescription}>
              Essentials Nutrition & Supplements from all over the suppliers around the World
            </Text>
            <TouchableOpacity
              style={styles.shopNowButton}
              onPress={() => navigation.navigate('ProductCatalog')}
            >
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Section */}
        {/* <View style={styles.welcomeSection}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="gift" size={24} color={colors.primary} />
              </View>
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Welcome to Doccure</Text>
                <Text style={styles.welcomeDescription}>
                  Download the app get free medicine & 50% off on your first order
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.downloadButton}>
              <Text style={styles.downloadButtonText}>Download App</Text>
            </TouchableOpacity>
          </View>

          {/* Promotional Cards */}
          {promotionalCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.promotionalCard}
              onPress={() => navigation.navigate('ProductCatalog')}
            >
              <View style={styles.promotionalContent}>
                <Text style={styles.promotionalTitle}>
                  {card.title} <Text style={styles.promotionalHighlight}>{card.titleHighlight}</Text>
                </Text>
                {card.subtitle && <Text style={styles.promotionalSubtitle}>{card.subtitle}</Text>}
                {card.code && <Text style={styles.promotionalCode}>Code: {card.code}</Text>}
                <TouchableOpacity style={styles.promotionalButton}>
                  <Text style={styles.promotionalButtonText}>Shop Now</Text>
                </TouchableOpacity>
              </View>
              <Image source={card.image} style={styles.promotionalImage} />
            </TouchableOpacity>
          ))}
        {/* </View> */}

        {/* Deals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Great deals on top picks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductCatalog')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealsContainer}
          >
            {deals.map((deal) => (
              <TouchableOpacity
                key={deal.id}
                style={styles.dealCard}
                onPress={() => navigation.navigate('ProductCatalog')}
              >
                <Image source={deal.image} style={styles.dealImage} />
                <Text style={styles.dealName}>{deal.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Popular Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('ProductCatalog')}
              >
                <Image source={category.image} style={styles.categoryImage} />
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryProducts}>{category.products}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductCatalog')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => navigation.navigate('ProductDetails', { productId: product.id.toString() })}
              >
                <View style={styles.productImageContainer}>
                  <Image source={product.image} style={styles.productImage} />
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
                      <Text style={styles.productPrice}>{product.price}</Text>
                      {product.originalPrice && (
                        <Text style={styles.originalPrice}>{product.originalPrice}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.cartButton}
                      onPress={() => navigation.navigate('Cart')}
                    >
                      <Ionicons name="cart-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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
  bannerSection: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomRightRadius:30,
    borderBottomLeftRadius:30,
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryProducts: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
