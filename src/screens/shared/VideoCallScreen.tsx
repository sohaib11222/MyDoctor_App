import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { AppointmentsStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoCall } from '../../hooks/useVideoCall';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as videoApi from '../../services/video';
import * as appointmentApi from '../../services/appointment';
import {
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
} from '@stream-io/video-react-native-sdk';

type VideoCallScreenNavigationProp = StackNavigationProp<AppointmentsStackParamList, 'VideoCall'>;
type VideoCallScreenRouteProp = RouteProp<AppointmentsStackParamList, 'VideoCall'>;

const VideoCallScreen = () => {
  const navigation = useNavigation<VideoCallScreenNavigationProp>();
  const route = useRoute<VideoCallScreenRouteProp>();
  const { user } = useAuth();
  const { appointmentId } = route.params;
  
  // Fetch appointment details to check time window
  const { data: appointmentData, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.getAppointmentById(appointmentId),
    enabled: !!appointmentId,
  });

  const appointment = appointmentData?.data || appointmentData;
  
  const { client, call, loading, error, startCall, endCall } = useVideoCall(appointmentId);
  const [callStarted, setCallStarted] = useState(false);
  const startCallRef = useRef(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null);
  const errorShownRef = useRef(false); // Track if error has been shown

  // Check appointment time window before starting call
  const checkAppointmentTime = () => {
    if (!appointment) return { isValid: false, message: 'Appointment not found' };

    const now = new Date();
    const appointmentStartDateTime = new Date(appointment.appointmentDate);
    const [startHours, startMinutes] = appointment.appointmentTime.split(':').map(Number);
    appointmentStartDateTime.setHours(startHours, startMinutes, 0, 0);
    
    // Calculate end time
    const duration = appointment.appointmentDuration || 30;
    let appointmentEndDateTime: Date;
    if (appointment.appointmentEndTime) {
      const [endHours, endMinutes] = appointment.appointmentEndTime.split(':').map(Number);
      appointmentEndDateTime = new Date(appointment.appointmentDate);
      appointmentEndDateTime.setHours(endHours, endMinutes, 0, 0);
    } else {
      appointmentEndDateTime = new Date(appointmentStartDateTime.getTime() + duration * 60 * 1000);
    }

    if (now < appointmentStartDateTime) {
      return {
        isValid: false,
        message: `Video call is only available during the scheduled appointment time. Your appointment starts at ${appointmentStartDateTime.toLocaleString()}.`,
        startTime: appointmentStartDateTime,
        endTime: appointmentEndDateTime
      };
    }

    if (now > appointmentEndDateTime) {
      return {
        isValid: false,
        message: `The appointment time has passed. The appointment window was from ${appointmentStartDateTime.toLocaleString()} to ${appointmentEndDateTime.toLocaleString()}. Video call is no longer available.`,
        startTime: appointmentStartDateTime,
        endTime: appointmentEndDateTime
      };
    }

    return {
      isValid: true,
      message: null,
      startTime: appointmentStartDateTime,
      endTime: appointmentEndDateTime
    };
  };

  // Check appointment time and show error only once (as Alert, not toast)
  useEffect(() => {
    if (!appointment || appointmentLoading || errorShownRef.current) return;

    const timeCheck = checkAppointmentTime();
    if (!timeCheck.isValid) {
      errorShownRef.current = true;
      setTimeValidationError(timeCheck.message);
      // Show single Alert instead of toast
      Alert.alert(
        'Appointment Time Issue',
        timeCheck.message,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    }
  }, [appointment, appointmentLoading, navigation]);

  useEffect(() => {
    console.log('🔍 [VideoCallScreen] useEffect triggered:', {
      appointmentId,
      hasUser: !!user,
      callStarted,
      loading,
      hasClient: !!client,
      hasCall: !!call,
      startCallRef: startCallRef.current,
      timeValidationError,
      appointmentLoading,
    });

    // Don't start call if time validation failed
    if (timeValidationError) {
      return;
    }

    // Start call immediately when component mounts (if not already started)
    if (appointmentId && user && !startCallRef.current && !loading && !appointmentLoading) {
      // Check appointment time before starting
      const timeCheck = checkAppointmentTime();
      if (!timeCheck.isValid) {
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          setTimeValidationError(timeCheck.message);
          // Show single Alert instead of toast
          Alert.alert(
            'Appointment Time Issue',
            timeCheck.message,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        }
        return;
      }

      console.log('🚀 [VideoCallScreen] Starting video call...');
      startCallRef.current = true;
      setCallStarted(true);
      
      startCall()
        .then(() => {
          console.log('✅ [VideoCallScreen] Video call started successfully');
          Toast.show({
            type: 'success',
            text1: 'Video Call Started',
            text2: 'You are now connected',
          });
          setIsCallActive(true);
        })
        .catch((err) => {
          console.error('❌ [VideoCallScreen] Error starting call:', err);
          
          let errorMessage = err.response?.data?.message || err.message || 'Failed to start video call';
          
          // Check if it's a time-related error - show as Alert only, not toast
          if (errorMessage.includes('appointment time') || errorMessage.includes('time has passed') || errorMessage.includes('not arrived yet') || errorMessage.includes('time window')) {
            if (!errorShownRef.current) {
              errorShownRef.current = true;
              setTimeValidationError(errorMessage);
              // Show single Alert instead of toast
              Alert.alert(
                'Appointment Time Issue',
                errorMessage,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
                { cancelable: false }
              );
            }
          } else if (err.message?.includes('permission') || err.message?.includes('Permission')) {
            // Check if it's a permission error
            errorMessage = err.message;
            Toast.show({
              type: 'error',
              text1: 'Permission Required',
              text2: errorMessage,
              visibilityTime: 8000,
            });
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: errorMessage,
            });
          }
          
          startCallRef.current = false;
          setCallStarted(false);
        });
    }
  }, [appointmentId, user, loading, startCall, appointment, appointmentLoading, timeValidationError, navigation]);

  const handleEndCall = async () => {
    try {
      setIsCallActive(false);
      if (call) {
        // Get session ID from call metadata or try to find it
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
        text1: 'Call Ended',
        text2: 'The video call has been ended',
      });
      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error ending call',
      });
      console.error(err);
    }
  };

  // Handle back button on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = require('react-native').BackHandler;
      const backAction = () => {
        if (isCallActive && call) {
          Alert.alert(
            'End Call?',
            'Are you sure you want to end the call?',
            [
              {
                text: 'Stay in Call',
                onPress: () => null,
                style: 'cancel',
              },
              {
                text: 'End Call',
                onPress: handleEndCall,
                style: 'destructive',
              },
            ]
          );
          return true;
        }
        return false;
      };

      const backHandlerSubscription = backHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandlerSubscription.remove();
    }
  }, [isCallActive, call]);

  // Show error alert if time validation failed
  if (timeValidationError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Appointment Time Issue</Text>
          <Text style={styles.errorText}>{timeValidationError}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Appointments</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || appointmentLoading || !client || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing video call...</Text>
          {appointmentLoading && <Text style={styles.loadingSubtext}>Loading appointment details...</Text>}
          {!client && <Text style={styles.loadingSubtext}>Connecting to server...</Text>}
          {!call && <Text style={styles.loadingSubtext}>Creating call session...</Text>}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <VideoCallContent 
          onEndCall={handleEndCall} 
          currentUserId={user?._id || user?.id}
          currentUserRole={user?.role?.toUpperCase() || 'PATIENT'}
        />
      </StreamCall>
    </StreamVideo>
  );
};

// Separate component to use Stream hooks
const VideoCallContent = ({ 
  onEndCall, 
  currentUserId, 
  currentUserRole 
}: { 
  onEndCall: () => void;
  currentUserId?: string;
  currentUserRole: string;
}) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  console.log('📹 [VideoCallContent] Call state:', callingState);
  console.log('👥 [VideoCallContent] Participants:', participants.length);

  // Don't render if call is not joined
  if (callingState !== 'joined') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Joining call...</Text>
          <Text style={styles.loadingSubtext}>State: {callingState}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Separate local and remote participants
  const localParticipant = participants.find(p => p.isLocalParticipant);
  const remoteParticipants = participants.filter(p => !p.isLocalParticipant);

  // Get unique participants by userId
  const uniqueRemoteParticipants = Array.from(
    new Map(remoteParticipants.map(p => [p.userId, p])).values()
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Video Consultation</Text>
          <Text style={styles.participantCount}>
            {localParticipant && uniqueRemoteParticipants.length > 0 ? '2 participants' : '1 participant'}
          </Text>
        </View>

        {/* Main video area - split screen */}
        <View style={styles.videoArea}>
          {/* Remote participant (left side) */}
          <View style={styles.remoteVideoContainer}>
            {uniqueRemoteParticipants.length > 0 ? (
              <ParticipantView 
                participant={uniqueRemoteParticipants[0]}
                style={styles.participantView}
              />
            ) : (
              <View style={styles.waitingContainer}>
                <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.waitingText}>
                  {currentUserRole === 'DOCTOR' ? 'Waiting for patient...' : 'Waiting for doctor...'}
                </Text>
              </View>
            )}
            {uniqueRemoteParticipants.length > 0 && (
              <View style={styles.participantLabel}>
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.participantLabelText}>
                  {currentUserRole === 'DOCTOR' ? 'Patient' : 'Doctor'}: {uniqueRemoteParticipants[0].name || 'User'}
                </Text>
              </View>
            )}
          </View>

          {/* Local participant (right side) */}
          {localParticipant ? (
            <View style={styles.localVideoContainer}>
              <ParticipantView 
                participant={localParticipant}
                style={styles.participantView}
              />
              <View style={styles.participantLabel}>
                <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.participantLabelText}>You</Text>
              </View>
            </View>
          ) : (
            <View style={styles.localVideoContainer}>
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.waitingText}>Initializing your video...</Text>
              </View>
            </View>
          )}
        </View>

        {/* Call Controls */}
        <CallControlsWrapper onEndCall={onEndCall} />
      </View>
    </SafeAreaView>
  );
};

// Call controls wrapper
const CallControlsWrapper = ({ onEndCall }: { onEndCall: () => void }) => {
  return <CustomCallControls onEndCall={onEndCall} />;
};

// Custom call controls
const CustomCallControls = ({ onEndCall }: { onEndCall: () => void }) => {
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
      <View style={styles.controlsBar}>
        {/* Microphone Toggle */}
        <TouchableOpacity
          onPress={toggleMic}
          style={[
            styles.controlButton,
            { backgroundColor: micState.microphone.enabled ? '#4CAF50' : '#dc3545' },
          ]}
        >
          <Ionicons
            name={micState.microphone.enabled ? 'mic' : 'mic-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Camera Toggle */}
        <TouchableOpacity
          onPress={toggleCamera}
          style={[
            styles.controlButton,
            { backgroundColor: cameraState.camera.enabled ? '#4CAF50' : '#dc3545' },
          ]}
        >
          <Ionicons
            name={cameraState.camera.enabled ? 'videocam' : 'videocam-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* End Call */}
        <TouchableOpacity
          onPress={onEndCall}
          style={[styles.controlButton, styles.endCallButton]}
        >
          <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantCount: {
    color: '#fff',
    fontSize: 14,
  },
  videoArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  localVideoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  participantView: {
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  participantLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  participantLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#dc3545',
  },
});

export default VideoCallScreen;
