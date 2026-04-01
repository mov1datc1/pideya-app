import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/auth';
import { colors, spacing, radius } from '../../constants/theme';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneVerify'>;

export default function PhoneVerifyScreen({ route }: Props) {
  const { driverId, driverPhone, driverName } = route.params;
  const { completePhoneVerify } = useAuth();

  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authService.sendPhoneOtp(driverPhone);
      setStep('verify');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Error', 'Ingresa el código completo de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      await authService.verifyPhoneOtp(driverPhone, code, driverId);
      completePhoneVerify();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping for now — driver can verify later
    completePhoneVerify();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Welcome */}
        <View style={styles.welcomeBox}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.white} />
          </View>
          <Text style={styles.welcome}>
            Bienvenido, {driverName}
          </Text>
          <Text style={styles.welcomeSub}>
            Verifica tu teléfono para recibir notificaciones de pedidos
          </Text>
        </View>

        {step === 'send' ? (
          <>
            <View style={styles.phoneBox}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.phoneText}>{driverPhone}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Enviar código SMS</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.otpLabel}>
              Ingresa el código de 6 dígitos
            </Text>
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, i)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  textContentType="oneTimeCode"
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Verificar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
              <Text style={styles.resendText}>Reenviar código</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  welcomeBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  otpLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resendText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
