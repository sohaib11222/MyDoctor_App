import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../types';
import { ChatListScreen } from '../../screens/shared/ChatListScreen';
import { ChatDetailScreen } from '../../screens/shared/ChatDetailScreen';
import { AdminChatScreen } from '../../screens/doctor/AdminChatScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export const ChatStack = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options, navigation: headerNavigation }) => {
          if (route.name === 'ChatDetail') {
            const params = route.params as ChatStackParamList['ChatDetail'];
            return (
              <CustomHeader
                title={params?.recipientName || t('chat.nav.chat')}
                showBack={true}
                leftComponent={
                  <View style={styles.headerLeftContent}>
                    <Image 
                      source={require('../../../assets/avatar.png')} 
                      style={styles.headerAvatar}
                    />
                    <Text style={styles.headerName} numberOfLines={1}>
                      {params?.recipientName || t('chat.nav.chat')}
                    </Text>
                  </View>
                }
                rightComponent={undefined}
              />
            );
          }
          return (
            <CustomHeader
              title={options.title || route.name}
              showBack={route.name !== 'ChatList'}
            />
          );
        },
      }}
    >
      <Stack.Screen 
        name="ChatList" 
        component={ChatListScreen}
        options={{ title: t('chat.nav.messages'), headerShown: false }}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={{ 
          headerShown: false, // Hide navigation header to avoid duplicate
        }}
      />
      <Stack.Screen 
        name="AdminChat" 
        component={AdminChatScreen}
        options={{ title: t('chat.nav.adminMessages'), headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
  },
});
