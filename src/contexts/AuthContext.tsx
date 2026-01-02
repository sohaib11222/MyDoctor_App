import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as authApi from '../services/auth';

export type UserRole = 'patient' | 'doctor';

export interface User {
  _id?: string;
  id?: string;
  email: string;
  role: UserRole;
  name?: string;
  fullName?: string;
  avatar?: string;
  profileImage?: string;
  token?: string;
  // Doctor specific
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  // Patient specific
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData, role: UserRole) => Promise<void>;
  updateUser: (userData: Partial<User> | User) => Promise<void>;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  password_confirmation?: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
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
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      
      if (token) {
        // Try to get user from API (this will refresh token if needed)
        try {
          const userData = await authApi.getUser();
          
          // Map backend user to app User interface
          const mappedUser: User = {
            _id: userData._id,
            id: userData._id || userData.id,
            email: userData.email,
            role: mapBackendRoleToAppRole(userData.role),
            name: userData.fullName || userData.name,
            fullName: userData.fullName || userData.name,
            avatar: userData.profileImage,
            profileImage: userData.profileImage,
            token,
            isVerified: userData.status === 'APPROVED',
            verificationStatus: mapBackendStatusToAppStatus(userData.status),
            status: userData.status,
            phone: userData.phone,
          };
          
          setUser(mappedUser);
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mappedUser));
        } catch (apiError) {
          // If API call fails, try to use stored user data
          const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser({ ...parsedUser, token });
          } else {
            // Clear token if no user data
            await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear corrupted data
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to map backend role to app role
  const mapBackendRoleToAppRole = (backendRole: string): UserRole => {
    const roleMap: Record<string, UserRole> = {
      PATIENT: 'patient',
      DOCTOR: 'doctor',
    };
    return roleMap[backendRole] || 'patient';
  };

  // Helper function to map backend status to app status
  const mapBackendStatusToAppStatus = (backendStatus?: string): 'pending' | 'approved' | 'rejected' => {
    if (!backendStatus) return 'pending';
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected'> = {
      PENDING: 'pending',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      BLOCKED: 'rejected',
    };
    return statusMap[backendStatus] || 'pending';
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.data?.user && response.data?.token) {
        const backendUser = response.data.user;
        
        // Map backend user to app User interface
        const mappedUser: User = {
          _id: backendUser._id,
          id: backendUser._id || backendUser.id,
          email: backendUser.email,
          role: mapBackendRoleToAppRole(backendUser.role),
          name: backendUser.fullName || backendUser.name,
          fullName: backendUser.fullName || backendUser.name,
          avatar: backendUser.profileImage,
          profileImage: backendUser.profileImage,
          token: response.data.token,
          isVerified: backendUser.status === 'APPROVED',
          verificationStatus: mapBackendStatusToAppStatus(backendUser.status),
          status: backendUser.status,
          phone: backendUser.phone,
        };

        setUser(mappedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mappedUser));

        // For pending doctors, they will be redirected to verification upload by AuthNavigator
        if (mappedUser.role === 'doctor' && mappedUser.verificationStatus === 'pending') {
          Toast.show({
            type: 'info',
            text1: 'Verification Required',
            text2: 'Please complete verification to continue',
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Login Successful',
            text2: `Welcome back, ${mappedUser.name || mappedUser.fullName || 'User'}!`,
          });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Please check your credentials';
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
      const response = await authApi.register(data, role);
      
      if (response.data?.user && response.data?.token) {
        const backendUser = response.data.user;
        
        // Map backend user to app User interface
        const mappedUser: User = {
          _id: backendUser._id,
          id: backendUser._id || backendUser.id,
          email: backendUser.email,
          role: mapBackendRoleToAppRole(backendUser.role),
          name: backendUser.fullName || backendUser.name,
          fullName: backendUser.fullName || backendUser.name,
          avatar: backendUser.profileImage,
          profileImage: backendUser.profileImage,
          token: response.data.token,
          isVerified: backendUser.status === 'APPROVED',
          verificationStatus: mapBackendStatusToAppStatus(backendUser.status),
          status: backendUser.status,
          phone: backendUser.phone,
        };

        // For doctors, set user but keep them in AuthNavigator for verification flow
        if (role === 'doctor' && mappedUser.verificationStatus === 'pending') {
          // Store user and token so they're logged in but stay in AuthNavigator
          setUser(mappedUser);
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mappedUser));
          
          Toast.show({
            type: 'success',
            text1: 'Registration Successful',
            text2: 'Please complete verification to continue',
          });
          
          // User will be redirected to DoctorVerificationUpload by AuthNavigator
          return;
        }

        // For patients or approved doctors, log them in
        setUser(mappedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mappedUser));

        Toast.show({
          type: 'success',
          text1: 'Registration Successful',
          text2: `Welcome, ${mappedUser.name || mappedUser.fullName || 'User'}!`,
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Please try again';
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
      await authApi.logout();
      setUser(null);
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local storage
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
      setUser(null);
    }
  };

  const updateUser = async (userData: Partial<User> | User) => {
    // If userData has all required fields, treat it as a full user
    if ('id' in userData && 'email' in userData && 'role' in userData) {
      const fullUser = userData as User;
      setUser(fullUser);
      // Store user without token in AsyncStorage
      const { token, ...userWithoutToken } = fullUser;
      const storageItems: [string, string][] = [
        [STORAGE_KEYS.USER, JSON.stringify(userWithoutToken)],
      ];
      if (token) {
        storageItems.push([STORAGE_KEYS.TOKEN, token]);
      }
      await AsyncStorage.multiSet(storageItems);
    } else if (user) {
      // Otherwise, update existing user
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      const { token, ...userWithoutToken } = updatedUser;
      const storageItems: [string, string][] = [
        [STORAGE_KEYS.USER, JSON.stringify(userWithoutToken)],
      ];
      if (token) {
        storageItems.push([STORAGE_KEYS.TOKEN, token]);
      }
      await AsyncStorage.multiSet(storageItems);
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
