import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
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
  const { sendOtp, loading, error, clearError } = useAuth();
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
});
