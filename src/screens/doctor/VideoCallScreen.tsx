import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatStackParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type VideoCallScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'VideoCall'>;
type VideoCallRouteProp = RouteProp<ChatStackParamList, 'VideoCall'>;

const { width, height } = Dimensions.get('window');

export const VideoCallScreen = () => {
  const navigation = useNavigation<VideoCallScreenNavigationProp>();
  const route = useRoute<VideoCallRouteProp>();
  const { callId } = route.params;
  const [callActive, setCallActive] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // Mock patient info - in real app, fetch based on callId
  const patientInfo = {
    name: 'Kelly Joseph',
    avatar: require('../../../assets/avatar.png'),
    appointmentId: '#Apt0001',
    isOnline: true,
  };

  useEffect(() => {
    // Start call timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: () => {
          setCallActive(false);
          // Navigate back to appointments or chat
          navigation.goBack();
        },
      },
    ]);
  };

  const toggleVideo = () => {
    setVideoEnabled((prev) => !prev);
    // In real app, toggle video track
  };

  const toggleAudio = () => {
    setAudioEnabled((prev) => !prev);
    // In real app, toggle audio track
  };

  if (!callActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.callEndedContainer}>
          <View style={styles.callEndedIcon}>
            <Ionicons name="call" size={64} color={colors.error} />
          </View>
          <Text style={styles.callEndedTitle}>Call Ended</Text>
          <Text style={styles.callEndedText}>The video consultation has been ended.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Back to Appointments</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Call Header */}
      <View style={styles.callHeader}>
        <View style={styles.patientInfo}>
          <View style={styles.patientAvatarContainer}>
            <Image source={patientInfo.avatar} style={styles.patientAvatar} />
            {patientInfo.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{patientInfo.name}</Text>
            <Text style={styles.appointmentId}>Appointment: {patientInfo.appointmentId}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addUserButton} activeOpacity={0.7}>
          <Ionicons name="person-add-outline" size={20} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {/* Remote Video (Patient) */}
        <View style={styles.remoteVideo}>
          <Image
            source={require('../../../assets/avatar.png')}
            style={styles.videoPlaceholder}
            resizeMode="cover"
          />
          {!videoEnabled && (
            <View style={styles.videoDisabledOverlay}>
              <Ionicons name="videocam-off" size={48} color={colors.textWhite} />
            </View>
          )}
        </View>

        {/* Local Video (Doctor) */}
        <View style={styles.localVideo}>
          <Image
            source={require('../../../assets/avatar.png')}
            style={styles.localVideoPlaceholder}
            resizeMode="cover"
          />
          {!videoEnabled && (
            <View style={styles.localVideoDisabledOverlay}>
              <Ionicons name="videocam-off" size={24} color={colors.textWhite} />
            </View>
          )}
        </View>

        {/* Call Timer */}
        <View style={styles.callTimer}>
          <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
        </View>
      </View>

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity
          style={[styles.controlButton, !videoEnabled && styles.controlButtonMuted]}
          onPress={toggleVideo}
          activeOpacity={0.7}
        >
          <Ionicons
            name={videoEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color={colors.textWhite}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={24} color={colors.textWhite} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !audioEnabled && styles.controlButtonMuted]}
          onPress={toggleAudio}
          activeOpacity={0.7}
        >
          <Ionicons
            name={audioEnabled ? 'mic' : 'mic-off'}
            size={24}
            color={colors.textWhite}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#000',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 4,
  },
  appointmentId: {
    fontSize: 12,
    color: colors.textWhite,
    opacity: 0.8,
  },
  addUserButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
  },
  videoDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  localVideoPlaceholder: {
    width: '100%',
    height: '100%',
  },
  localVideoDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTimer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    gap: 20,
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
  callEndedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  callEndedIcon: {
    marginBottom: 24,
  },
  callEndedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  callEndedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
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

