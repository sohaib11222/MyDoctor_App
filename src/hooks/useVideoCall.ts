import { useState, useCallback, useEffect, useRef } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-native-sdk';
import { useAuth } from '../contexts/AuthContext';
import * as videoApi from '../services/video';
import { STREAM_API_KEY } from '../config/stream';
import { Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const useVideoCall = (appointmentId: string | null) => {
  const { user } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request camera and microphone permissions for React Native
  const requestMediaPermissions = useCallback(async () => {
    try {
      console.log('🎥 [MOBILE] Requesting camera and microphone permissions...');

      if (Platform.OS === 'android') {
        // Request Android permissions
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera for video calls',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const audioPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for video calls',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Camera permission is required for video calls');
        }

        if (audioPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Microphone permission is required for video calls');
        }
      } else {
        // iOS permissions - use ImagePicker for camera, AV for audio
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        // For microphone on iOS, we'll rely on Stream SDK to request it
        // The Stream SDK will handle microphone permission requests
        
        if (!cameraStatus.granted) {
          throw new Error('Camera permission is required for video calls');
        }
      }

      console.log('✅ [MOBILE] Camera and microphone permissions granted');
      return true;
    } catch (err: any) {
      console.error('❌ [MOBILE] Permission request failed:', err);
      throw new Error(err.message || 'Failed to get camera/microphone permissions');
    }
  }, []);

  // Start video call
  const startCall = useCallback(async () => {
    if (!appointmentId || !user) {
      console.error('❌ [MOBILE] Missing appointmentId or user:', { appointmentId, user: !!user });
      return;
    }

    console.log('🚀 [MOBILE] Starting video call...');
    console.log('📋 [MOBILE] Appointment ID:', appointmentId);
    console.log('👤 [MOBILE] User:', user._id || user.id, user.fullName || user.name || user.email);
    console.log('🔑 [MOBILE] Stream API Key:', STREAM_API_KEY ? `${STREAM_API_KEY.substring(0, 4)}...` : 'MISSING');

    setLoading(true);
    setError(null);

    try {
      // Request camera and microphone permissions first
      await requestMediaPermissions();
      console.log('📡 [MOBILE] Calling backend API: /api/video/start');
      
      // Start session on backend
      const sessionData = await videoApi.startVideoSession(appointmentId);
      console.log('✅ [MOBILE] Backend response received:', sessionData);

      // Handle different response structures
      const responseData = sessionData?.data || sessionData;

      if (!responseData) {
        console.error('❌ [MOBILE] No data in response:', sessionData);
        throw new Error('Invalid response from backend: no data received');
      }

      const streamToken = responseData.streamToken;
      const streamCallId = responseData.streamCallId || responseData.sessionId || `appointment-${appointmentId}`;

      if (!streamToken) {
        console.error('❌ [MOBILE] No Stream token received from backend');
        console.error('❌ [MOBILE] Response data:', responseData);
        throw new Error('No Stream token received from backend. Please check backend logs.');
      }

      console.log('🔧 [MOBILE] Creating Stream client...');
      // Create Stream client
      const streamClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: user._id || user.id || '',
          name: user.fullName || user.name || user.email || 'User',
        },
        token: streamToken,
      });
      console.log('✅ [MOBILE] Stream client created');

      setClient(streamClient);

      console.log('📞 [MOBILE] Getting Stream call:', streamCallId);
      // Get or create call
      const streamCall = streamClient.call('default', streamCallId);
      console.log('📞 [MOBILE] Joining Stream call...');
      await streamCall.join({ create: true });
      console.log('✅ [MOBILE] Joined Stream call successfully');

      // Enable camera and microphone after joining
      try {
        console.log('🎥 [MOBILE] Enabling camera and microphone...');
        await streamCall.camera.enable();
        await streamCall.microphone.enable();
        console.log('✅ [MOBILE] Camera and microphone enabled');
      } catch (err) {
        console.warn('⚠️ [MOBILE] Could not enable camera/microphone:', err);
        // Don't throw - user might have denied permissions, but call can still continue
      }

      setCall(streamCall);

      return { streamClient, streamCall };
    } catch (err: any) {
      console.error('❌ [MOBILE] Error starting video call:', err);
      console.error('❌ [MOBILE] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });

      const errorMessage = err.response?.data?.message || err.message || 'Failed to start video call';
      console.error('❌ [MOBILE] Error message:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [appointmentId, user, requestMediaPermissions]);

  // End video call
  const endCall = useCallback(async () => {
    if (call) {
      try {
        await call.leave();
      } catch (err) {
        console.error('Error leaving call:', err);
      }
    }

    if (client) {
      try {
        await client.disconnectUser();
      } catch (err) {
        console.error('Error disconnecting client:', err);
      }
    }

    setCall(null);
    setClient(null);
  }, [call, client]);

  // Cleanup on unmount
  useEffect(() => {
    const currentCall = call;
    const currentClient = client;

    return () => {
      console.log('🧹 [useVideoCall] Cleanup: Component unmounting');
      if (currentCall) {
        currentCall.leave().catch((err) => {
          if (!err.message?.includes('already been left') && !err.message?.includes('already left')) {
            console.error('Error leaving call during cleanup:', err);
          }
        });
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  return {
    client,
    call,
    loading,
    error,
    startCall,
    endCall,
  };
};
