import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../types';
import { ChatListScreen } from '../../screens/shared/ChatListScreen';
import { ChatDetailScreen } from '../../screens/shared/ChatDetailScreen';
import { AdminChatScreen } from '../../screens/doctor/AdminChatScreen';
import { VideoCallScreen } from '../../screens/doctor/VideoCallScreen';
import { CustomHeader } from '../../components/common/CustomHeader';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export const ChatStack = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ route, options, navigation: headerNavigation }) => {
          if (route.name === 'ChatDetail') {
            const params = route.params as ChatStackParamList['ChatDetail'];
            return (
              <CustomHeader
                title={params?.recipientName || 'Chat'}
                showBack={true}
                leftComponent={
                  <View style={styles.headerLeftContent}>
                    <Image 
                      source={require('../../../assets/avatar.png')} 
                      style={styles.headerAvatar}
                    />
                    <Text style={styles.headerName} numberOfLines={1}>
                      {params?.recipientName || 'Chat'}
                    </Text>
                  </View>
                }
                rightComponent={
                  isDoctor ? (
                    <TouchableOpacity
                      style={styles.videoCallButton}
                      onPress={() => headerNavigation.navigate('VideoCall', { callId: params?.chatId || '1' })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="videocam" size={20} color={colors.textWhite} />
                    </TouchableOpacity>
                  ) : undefined
                }
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
        options={{ title: 'Messages', headerShown: false }}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={({ route }) => ({ 
          title: route.params.recipientName,
        })}
      />
      <Stack.Screen 
        name="AdminChat" 
        component={AdminChatScreen}
        options={{ title: 'Admin Messages', headerShown: false }}
      />
      <Stack.Screen 
        name="VideoCall" 
        component={VideoCallScreen}
        options={{ headerShown: false }}
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
  videoCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
