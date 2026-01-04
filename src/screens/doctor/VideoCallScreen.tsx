import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  StreamVideo,
  StreamCall,
  CallContent,
  useCallStateHooks,
  ParticipantView,
} from '@stream-io/video-react-native-sdk';
import { ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCall } from '../../hooks/useVideoCall';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import * as videoApi from '../../services/video';

type VideoCallScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'VideoCall'>;
type VideoCallRouteProp = RouteProp<ChatStackParamList, 'VideoCall'>;

const { width, height } = Dimensions.get('window');

export const VideoCallScreen = () => {
  const navigation = useNavigation<VideoCallScreenNavigationProp>();
  const route = useRoute<VideoCallRouteProp>();
  const { callId } = route.params;
  const { user } = useAuth();
  const [callStarted, setCallStarted] = useState(false);
  const startCallRef = useRef(false);
  const [isCallActive, setIsCallActive] = useState(false);

  // Use appointmentId from callId (assuming callId is appointmentId)
  const appointmentId = callId;

  const { client, call, loading, error, startCall, endCall } = useVideoCall(appointmentId);

  useEffect(() => {
    if (appointmentId && user && !startCallRef.current && !loading) {
      console.log('🚀 [VideoCallScreen] Starting video call...');
      startCallRef.current = true;
      setCallStarted(true);

      startCall()
        .then(() => {
          console.log('✅ [VideoCallScreen] Video call started successfully');
          Toast.show({
            type: 'success',
            text1: 'Video call started',
          });
          setIsCallActive(true);
        })
        .catch((err: any) => {
          console.error('❌ [VideoCallScreen] Error starting call:', err);
          let errorMessage = err.response?.data?.message || err.message || 'Failed to start video call';

          if (err.message?.includes('permission') || err.message?.includes('Permission')) {
            errorMessage = err.message;
            Toast.show({
              type: 'error',
              text1: errorMessage,
              visibilityTime: 8000,
            });
          } else {
            Toast.show({
              type: 'error',
              text1: errorMessage,
            });
          }

          startCallRef.current = false;
          setCallStarted(false);
        });
    }
  }, [appointmentId, user, loading, startCall]);

  const handleEndCall = async () => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsCallActive(false);
            if (call && appointmentId) {
              try {
                const sessionData = await videoApi.getVideoSessionByAppointment(appointmentId);
                if (sessionData.data?.sessionId) {
                  await videoApi.endVideoSession(sessionData.data.sessionId);
                }
              } catch (err) {
                console.error('Error ending session on backend:', err);
              }
            }
            await endCall();
            Toast.show({
              type: 'success',
              text1: 'Call ended',
            });
            navigation.goBack();
          } catch (err) {
            Toast.show({
              type: 'error',
              text1: 'Error ending call',
            });
            console.error(err);
          }
        },
      },
    ]);
  };

  if (loading || !client || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing video call...</Text>
          {!client && <Text style={styles.loadingSubtext}>Initializing client...</Text>}
          {!call && <Text style={styles.loadingSubtext}>Creating call...</Text>}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <VideoCallContent onEndCall={handleEndCall} currentUserId={user?._id || user?.id} />
        </StreamCall>
      </StreamVideo>
    </SafeAreaView>
  );
};

// Separate component to use Stream hooks
const VideoCallContent = ({
  onEndCall,
  currentUserId,
}: {
  onEndCall: () => void;
  currentUserId?: string;
}) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  // Separate local and remote participants
  const localParticipant = participants.find((p) => p.isLocalParticipant);
  const remoteParticipants = participants.filter((p) => !p.isLocalParticipant);

  // Get unique participants by userId
  const uniqueRemoteParticipants = Array.from(
    new Map(remoteParticipants.map((p) => [p.userId, p])).values()
  );

  // Don't render if call is not joined
  if (callingState !== 'joined') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Joining call... (State: {callingState})</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Video Consultation</Text>
        <Text style={styles.participantCount}>
          {localParticipant && uniqueRemoteParticipants.length > 0 ? '2 participants' : '1 participant'}
        </Text>
      </View>

      {/* Video Area - 50/50 split */}
      <View style={styles.videoContainer}>
        {/* Left side - Remote participant (Patient) */}
        <View style={styles.videoPanel}>
          {uniqueRemoteParticipants.length > 0 ? (
            <>
              <ParticipantView
                participant={uniqueRemoteParticipants[0]}
                style={styles.remoteVideo}
              />
              <View style={styles.participantLabel}>
                <View style={[styles.labelDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.labelText}>
                  Patient: {uniqueRemoteParticipants[0].name || uniqueRemoteParticipants[0].userId || 'Patient'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>Waiting for patient to join...</Text>
            </View>
          )}
        </View>

        {/* Right side - Local participant (Doctor/You) */}
        {localParticipant && (
          <View style={styles.videoPanel}>
            <ParticipantView participant={localParticipant} style={styles.localVideo} />
            <View style={styles.participantLabel}>
              <View style={[styles.labelDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.labelText}>Doctor: You</Text>
            </View>
          </View>
        )}
      </View>

      {/* Call Controls */}
      <CallControls onEndCall={onEndCall} />
    </View>
  );
};

// Call Controls Component
const CallControls = ({ onEndCall }: { onEndCall: () => void }) => {
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const micState = useMicrophoneState();
  const cameraState = useCameraState();

  const toggleMic = async () => {
    try {
      if (micState.microphone.enabled) {
        await micState.microphone.disable();
      } else {
        await micState.microphone.enable();
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
    }
  };

  const toggleCamera = async () => {
    try {
      if (cameraState.camera.enabled) {
        await cameraState.camera.disable();
      } else {
        await cameraState.camera.enable();
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
    }
  };

  return (
    <View style={styles.controlsContainer}>
      <View style={styles.controls}>
        {/* Microphone Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            !micState.microphone.enabled && styles.controlButtonMuted,
          ]}
          onPress={toggleMic}
          activeOpacity={0.7}
        >
          <Ionicons
            name={micState.microphone.enabled ? 'mic' : 'mic-off'}
            size={24}
            color={colors.textWhite}
          />
        </TouchableOpacity>

        {/* Camera Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            !cameraState.camera.enabled && styles.controlButtonMuted,
          ]}
          onPress={toggleCamera}
          activeOpacity={0.7}
        >
          <Ionicons
            name={cameraState.camera.enabled ? 'videocam' : 'videocam-off'}
            size={24}
            color={colors.textWhite}
          />
        </TouchableOpacity>

        {/* End Call */}
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={24} color={colors.textWhite} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: colors.textWhite,
    fontSize: 16,
    marginTop: 16,
  },
  loadingSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#000',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textWhite,
  },
  participantCount: {
    fontSize: 14,
    color: colors.textWhite,
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  videoPanel: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  participantLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 8,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textWhite,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 18,
    color: colors.textWhite,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonMuted: {
    backgroundColor: colors.error,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});
