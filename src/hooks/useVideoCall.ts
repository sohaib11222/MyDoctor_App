import { useState, useCallback, useEffect, useRef } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-native-sdk';
import { useAuth } from '../contexts/AuthContext';
import * as videoApi from '../services/video';
import { Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const STREAM_API_KEY = '3cp572t2hewb'; // TODO: Move to environment variables

export const useVideoCall = (appointmentId: string | null) => {
  const { user } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startCallRef = useRef(false);

  // Request camera and microphone permissions
  const requestMediaPermissions = async (): Promise<boolean> => {
    try {
      console.log('🎥 [FRONTEND] Requesting camera and microphone permissions...');

      // Request camera permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        throw new Error('Camera permission is required for video calls. Please allow access in your device settings.');
      }

      // Request microphone permission (Android)
      if (Platform.OS === 'android') {
        const micPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for video calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (micPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Microphone permission is required for video calls. Please allow access in your device settings.');
        }
      }
      // iOS will prompt for microphone permission automatically when Stream SDK accesses it

      console.log('✅ [FRONTEND] Camera and microphone permissions granted');
      return true;
    } catch (err: any) {
      console.error('❌ [FRONTEND] Permission request failed:', err);
      throw err;
    }
  };

  // Start video call
  const startCall = useCallback(async () => {
    if (!appointmentId || !user) {
      console.error('❌ [FRONTEND] Missing appointmentId or user:', { appointmentId, user: !!user });
      return;
    }

    if (startCallRef.current) {
      console.log('⚠️ [FRONTEND] Call already starting, skipping...');
      return;
    }

    console.log('🚀 [FRONTEND] Starting video call...');
    console.log('📋 [FRONTEND] Appointment ID:', appointmentId);
    console.log('👤 [FRONTEND] User:', user._id || user.id, user.fullName || user.name || user.email);
    console.log('🔑 [FRONTEND] Stream API Key:', STREAM_API_KEY ? `${STREAM_API_KEY.substring(0, 4)}...` : 'MISSING');

    setLoading(true);
    setError(null);
    startCallRef.current = true;

    try {
      // Request camera and microphone permissions first
      await requestMediaPermissions();

      console.log('📡 [FRONTEND] Calling backend API: /api/video/start');
      // Start session on backend
      const sessionData = await videoApi.startVideoSession(appointmentId);
      console.log('✅ [FRONTEND] Backend response received:', sessionData);

      // Handle different response structures
      const responseData = sessionData?.data || sessionData;

      if (!responseData) {
        console.error('❌ [FRONTEND] No data in response:', sessionData);
        throw new Error('Invalid response from backend: no data received');
      }

      const streamToken = responseData.streamToken;
      const streamCallId = responseData.streamCallId || responseData.sessionId || `appointment-${appointmentId}`;

      if (!streamToken) {
        console.error('❌ [FRONTEND] No Stream token received from backend');
        console.error('❌ [FRONTEND] Response data:', responseData);
        throw new Error('No Stream token received from backend. Please check backend logs.');
      }

      console.log('🔧 [FRONTEND] Creating Stream client...');
      // Create Stream client
      const streamClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: user._id || user.id || '',
          name: user.fullName || user.name || user.email || 'User',
        },
        token: streamToken,
      });
      console.log('✅ [FRONTEND] Stream client created');

      setClient(streamClient);

      console.log('📞 [FRONTEND] Getting Stream call:', streamCallId);
      // Get or create call
      const streamCall = streamClient.call('default', streamCallId);
      console.log('📞 [FRONTEND] Joining Stream call...');
      await streamCall.join({ create: true });
      console.log('✅ [FRONTEND] Joined Stream call successfully');

      // Enable camera and microphone after joining
      try {
        console.log('🎥 [FRONTEND] Enabling camera and microphone...');
        await streamCall.camera.enable();
        await streamCall.microphone.enable();
        console.log('✅ [FRONTEND] Camera and microphone enabled');
      } catch (err) {
        console.warn('⚠️ [FRONTEND] Could not enable camera/microphone:', err);
        // Don't throw - user might have denied permissions, but call can still continue
      }

      setCall(streamCall);

      return { streamClient, streamCall };
    } catch (err: any) {
      console.error('❌ [FRONTEND] Error starting video call:', err);
      console.error('❌ [FRONTEND] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });

      const errorMessage = err.response?.data?.message || err.message || 'Failed to start video call';
      console.error('❌ [FRONTEND] Error message:', errorMessage);
      setError(errorMessage);
      startCallRef.current = false;
      throw err;
    } finally {
      setLoading(false);
    }
  }, [appointmentId, user]);

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
    startCallRef.current = false;
  }, [call, client]);

  // Cleanup on unmount
  useEffect(() => {
    const currentCall = call;
    const currentClient = client;

    return () => {
      console.log('🧹 [useVideoCall] Cleanup: Component unmounting');
      if (currentCall) {
        currentCall.leave().catch((err: any) => {
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

