import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Logo } from '../../components/branding/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const OTP_EMAIL_KEY = '@pideya_otp_pending_email';

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { sendOtp, googleSignIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');

  // If user left the app to check Gmail and the app restarted,
  // restore directly to OtpVerify screen
  useEffect(() => {
    (async () => {
      try {
        const pendingEmail = await AsyncStorage.getItem(OTP_EMAIL_KEY);
        if (pendingEmail) {
          navigation.navigate('OtpVerify', { email: pendingEmail });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Email invalido', 'Ingresa un email valido para recibir tu codigo.');
      return;
    }
    try {
      await sendOtp(trimmed);
      navigation.navigate('OtpVerify', { email: trimmed });
    } catch {
      // error handled in hook
    }
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Logo size="lg" />
          <Text style={styles.title}>Entra o crea tu cuenta</Text>
          <Text style={styles.subtitle}>Te enviaremos un codigo a tu correo</Text>
        </View>

        <View style={styles.form}>
          {/* Email OTP */}
          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Continuar con email"
            onPress={handleSendOtp}
            loading={loading}
            size="lg"
            style={styles.btn}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={googleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Legacy login link */}
          <Button
            title="Entrar con contraseña"
            variant="ghost"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    ...textStyles.h2,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  btn: {
    marginTop: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors['ink-hint'],
    opacity: 0.3,
  },
  dividerText: {
    ...textStyles.caption,
    color: colors['ink-hint'],
    marginHorizontal: spacing.md,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c4043',
  },
});
