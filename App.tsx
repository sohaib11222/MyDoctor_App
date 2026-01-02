import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

// Toast configuration with warning type
const toastConfig = {
  warning: ({ text1, text2 }: any) => (
    <View style={{ height: 60, width: '90%', backgroundColor: '#FFA500', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        {text1 && <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 }}>{text1}</Text>}
        {text2 && <Text style={{ fontSize: 12, color: '#fff' }}>{text2}</Text>}
      </View>
    </View>
  ),
};

export default function App() {
  return (
    <PaperProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
            <StatusBar style="auto" />
            <Toast config={toastConfig} />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
