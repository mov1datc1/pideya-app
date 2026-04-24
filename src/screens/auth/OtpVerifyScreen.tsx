import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

const CODE_LENGTH = 6;
const OTP_EMAIL_KEY = '@pideya_otp_pending_email';

export const OtpVerifyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;
  const { verifyOtp, sendOtp, loading, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputRef = useRef<TextInput>(null);
  const appStateRef = useRef(AppState.currentState);

  // Persist email so if user leaves app (e.g. to check Gmail) and
  // the OS kills the app, LoginScreen can restore navigation here.
  useEffect(() => {
    AsyncStorage.setItem(OTP_EMAIL_KEY, email).catch(() => {});
    return () => {
      // Clear only when user explicitly navigates away
    };
  }, [email]);

  // Re-focus input when app comes back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Countdown for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Codigo incompleto', `Ingresa los ${CODE_LENGTH} digitos del codigo.`);
      return;
    }
    try {
      await verifyOtp(email, code);
      // Auth state change will handle navigation automatically
      // Clear persisted email on success
      AsyncStorage.removeItem(OTP_EMAIL_KEY).catch(() => {});
    } catch {
      // error handled in hook
    }
  };

  const handleResend = async () => {
    clearError();
    try {
      await sendOtp(email);
      setResendTimer(60);
      setCode('');
      Alert.alert('Codigo reenviado', 'Revisa tu bandeja de entrada.');
    } catch {
      // error handled in hook
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    clearError();
    // Auto-submit when complete
    if (cleaned.length === CODE_LENGTH) {
      setTimeout(async () => {
        try {
          await verifyOtp(email, cleaned);
        } catch {
          // handled
        }
      }, 200);
    }
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Cambiar email</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📧</Text>
          </View>

          <Text style={styles.title}>Revisa tu correo</Text>
          <Text style={styles.subtitle}>
            Enviamos un codigo de {CODE_LENGTH} digitos a
          </Text>
          <Text style={styles.email}>{email}</Text>

          {/* Code input */}
          <View style={styles.codeContainer}>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoComplete="one-time-code"
            />
            <TouchableOpacity
              style={styles.codeBoxes}
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    code.length === i && styles.codeBoxActive,
                    code.length > i && styles.codeBoxFilled,
                  ]}
                >
                  <Text style={[styles.codeDigit, code.length > i && styles.codeDigitFilled]}>
                    {code[i] || ''}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Verificar codigo"
            onPress={handleVerify}
            loading={loading}
            size="lg"
            style={styles.verifyBtn}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Reenviar codigo en {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Reenviar codigo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors.agave,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    ...textStyles.h2,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    textAlign: 'center',
  },
  email: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.agave,
    marginTop: 2,
  },
  codeContainer: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  codeBoxes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    width: 46,
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.snow,
  },
  codeBoxActive: {
    borderColor: colors.agave,
    backgroundColor: colors.white,
  },
  codeBoxFilled: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  codeDigit: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: colors['ink-hint'],
  },
  codeDigitFilled: {
    color: colors.agave,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  verifyBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  resendRow: {
    marginTop: spacing.xl,
  },
  resendTimer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-muted'],
  },
  resendLink: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.agave,
  },
});
