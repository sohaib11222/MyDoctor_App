import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export type UserRole = 'patient' | 'doctor' | 'pharmacy';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  token?: string;
  // Doctor specific
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  // Patient specific
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData, role: UserRole) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const [userData, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      ]);

      if (userData && token) {
        const parsedUser = JSON.parse(userData);
        setUser({ ...parsedUser, token });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear corrupted data
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role: UserRole = 'patient') => {
    try {
      // TODO: Replace with actual API call
      // For now, using mock data based on role
      const mockUsers: Record<UserRole, User> = {
        patient: {
          id: '1',
          email,
          role: 'patient',
          name: 'John Doe',
          phone: '+1234567890',
        },
        doctor: {
          id: '2',
          email,
          role: 'doctor',
          name: 'Dr. Jane Smith',
          isVerified: true,
          verificationStatus: 'approved',
        },
        pharmacy: {
          id: '3',
          email,
          role: 'pharmacy',
          name: 'Pharmacy Name',
        },
      };

      const mockToken = `mock_token_${Date.now()}`;
      const userData = mockUsers[role];
      const userWithToken = { ...userData, token: mockToken };

      // Store user and token
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(userData)],
        [STORAGE_KEYS.TOKEN, mockToken],
      ]);

      setUser(userWithToken);

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome back, ${userData.name}!`,
      });
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please check your credentials';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
      });
      throw error;
    }
  };

  const register = async (data: RegisterData, role: UserRole) => {
    try {
      // TODO: Replace with actual API call
      const newUser: User = {
        id: Date.now().toString(),
        email: data.email,
        role,
        name: data.name,
        phone: data.phone,
        // Doctor specific
        ...(role === 'doctor' && {
          isVerified: false,
          verificationStatus: 'pending' as const,
        }),
      };

      const mockToken = `mock_token_${Date.now()}`;
      const userWithToken = { ...newUser, token: mockToken };

      // For doctors, don't log them in until verification is complete
      // Store registration data temporarily but don't set user state
      if (role === 'doctor' && !newUser.isVerified) {
        // Store registration data temporarily for verification flow
        await AsyncStorage.setItem('pending_doctor_registration', JSON.stringify(newUser));
        
        Toast.show({
          type: 'success',
          text1: 'Registration Successful',
          text2: 'Please complete verification to continue',
        });

        Toast.show({
          type: 'info',
          text1: 'Verification Required',
          text2: 'Please complete doctor verification',
        });
        
        // Don't set user, so they stay in AuthNavigator
        return;
      }

      // For pharmacy, don't log them in until registration steps are complete
      if (role === 'pharmacy') {
        // Store registration data temporarily for multi-step registration flow
        await AsyncStorage.setItem('pending_pharmacy_registration', JSON.stringify(newUser));
        
        Toast.show({
          type: 'success',
          text1: 'Registration Started',
          text2: 'Please complete registration steps',
        });
        
        // Don't set user, so they stay in AuthNavigator
        return;
      }

      // For non-doctor/pharmacy roles or verified doctors, log them in
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(newUser)],
        [STORAGE_KEYS.TOKEN, mockToken],
      ]);

      setUser(userWithToken);

      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: `Welcome, ${newUser.name}!`,
      });
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: errorMessage,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
      setUser(null);
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (userData: Partial<User> | User) => {
    // If userData has all required fields, treat it as a full user
    if ('id' in userData && 'email' in userData && 'role' in userData) {
      const fullUser = userData as User;
      setUser(fullUser);
      // Store user without token in AsyncStorage
      const { token, ...userWithoutToken } = fullUser;
      AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(userWithoutToken)],
        ...(token ? [[STORAGE_KEYS.TOKEN, token]] : []),
      ]);
    } else if (user) {
      // Otherwise, update existing user
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      const { token, ...userWithoutToken } = updatedUser;
      AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(userWithoutToken)],
        ...(token ? [[STORAGE_KEYS.TOKEN, token]] : []),
      ]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
