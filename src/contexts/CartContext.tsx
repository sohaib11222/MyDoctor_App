import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import i18n from '../i18n/appI18n';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  sku?: string;
  stock: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  isInCart: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    saveCart();
  }, [cartItems]);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart from AsyncStorage:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to AsyncStorage:', error);
    }
  };

  const addToCart = (product: any, quantity: number = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item._id === product._id);

      if (existingItem) {
        // Update quantity if item already exists
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock && newQuantity > product.stock) {
          Toast.show({
            type: 'warning',
            text1: i18n.t('pharmacy.cartToast.stockLimitTitle'),
            text2: i18n.t('pharmacy.cartToast.stockLimitBody', { count: product.stock }),
          });
          return prevItems;
        }
        return prevItems.map((item) =>
          item._id === product._id ? { ...item, quantity: newQuantity } : item
        );
      } else {
        // Add new item to cart
        if (product.stock === 0) {
          Toast.show({
            type: 'error',
            text1: i18n.t('pharmacy.cartToast.outOfStockTitle'),
            text2: i18n.t('pharmacy.cartToast.outOfStockBody'),
          });
          return prevItems;
        }
        if (product.stock && quantity > product.stock) {
          Toast.show({
            type: 'warning',
            text1: i18n.t('pharmacy.cartToast.stockLimitTitle'),
            text2: i18n.t('pharmacy.cartToast.stockLimitBody', { count: product.stock }),
          });
          return prevItems;
        }
        Toast.show({
          type: 'success',
          text1: i18n.t('pharmacy.cartToast.addedToCartTitle'),
          text2: i18n.t('pharmacy.cartToast.addedToCartBody', { name: product.name }),
        });
        return [
          ...prevItems,
          {
            _id: product._id,
            name: product.name,
            price: product.discountPrice || product.price,
            originalPrice: product.price,
            image: product.images?.[0] || '',
            quantity,
            sku: product.sku,
            stock: product.stock || 0,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) => {
      const item = prevItems.find((i) => i._id === productId);
      if (item && item.stock && quantity > item.stock) {
        Toast.show({
          type: 'warning',
          text1: i18n.t('pharmacy.cartToast.stockLimitTitle'),
          text2: i18n.t('pharmacy.cartToast.stockLimitBody', { count: item.stock }),
        });
        return prevItems;
      }
      return prevItems.map((item) => (item._id === productId ? { ...item, quantity } : item));
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const isInCart = (productId: string) => {
    return cartItems.some((item) => item._id === productId);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

