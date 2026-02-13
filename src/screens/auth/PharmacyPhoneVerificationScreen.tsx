import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import * as authApi from '../../services/auth';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

const PHONE_E164_REGEX = /^\+\d{7,15}$/;

export const PharmacyPhoneVerificationScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const phone = useMemo(() => String((user as any)?.phone || ''), [user]);

  useEffect(() => {
    const isPharmacy = user?.role === 'pharmacy' || user?.role === 'parapharmacy';
    if (!user || !isPharmacy) {
      navigation.replace('Login');
      return;
    }
    if ((user as any)?.isPhoneVerified) {
      navigation.replace('PharmacyVerificationUpload');
      return;
    }

    const send = async () => {
      if (!PHONE_E164_REGEX.test(phone)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Phone Number',
          text2: 'Please register with a valid phone number in E.164 format.',
        });
        return;
      }

      setSending(true);
      try {
        await authApi.sendPhoneOtp(phone);
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: `Verification code sent to ${phone}`,
        });
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to send OTP';
        Toast.show({ type: 'error', text1: 'Error', text2: msg });
      } finally {
        setSending(false);
      }
    };

    send();
  }, [navigation, phone, user]);

  const onResend = async () => {
    if (!PHONE_E164_REGEX.test(phone)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone Number',
        text2: 'Please register with a valid phone number in E.164 format.',
      });
      return;
    }

    setSending(true);
    try {
      await authApi.sendPhoneOtp(phone);
      Toast.show({
        type: 'success',
        text1: 'OTP Resent',
        text2: `Verification code resent to ${phone}`,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to resend OTP';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setSending(false);
    }
  };

  const onVerify = async () => {
    const trimmed = String(code || '').trim();
    if (trimmed.length < 4) {
      Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter the OTP code.' });
      return;
    }

    setVerifying(true);
    try {
      await authApi.verifyPhoneOtp(trimmed, phone);
      await updateUser({ isPhoneVerified: true } as any);
      Toast.show({ type: 'success', text1: 'Verified', text2: 'Phone number verified successfully.' });
      navigation.replace('PharmacyVerificationUpload');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Invalid or expired code';
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: msg });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Ionicons name="chatbubble-ellipses-outline" size={54} color={colors.primary} />
          <Text style={styles.title}>Phone Verification</Text>
          <Text style={styles.subtitle}>Enter the code sent to your phone number</Text>
        </View>

        <View style={styles.card}>
          <Input
            label="OTP Code"
            placeholder="Enter OTP"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />

          <Button
            title={verifying ? 'Verifying...' : 'Verify'}
            onPress={onVerify}
            loading={verifying}
            disabled={verifying || sending}
            style={styles.primaryButton}
          />

          <TouchableOpacity style={styles.resendBtn} onPress={onResend} disabled={sending || verifying}>
            <Text style={[styles.resendText, (sending || verifying) && styles.resendTextDisabled]}>
              {sending ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 14,
    padding: 16,
  },
  primaryButton: {
    marginTop: 12,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  resendTextDisabled: {
    opacity: 0.6,
  },
});
