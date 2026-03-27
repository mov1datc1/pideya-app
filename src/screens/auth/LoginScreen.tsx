import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Logo } from '../../components/branding/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { sendOtp, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');

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
            <Text style={styles.dividerText}>o continua con</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => Alert.alert(
                'Google Sign-In',
                'Para activar Google Sign-In necesitas configurar las credenciales OAuth en Supabase y Google Cloud Console. Consulta la documentacion.',
              )}
            >
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialLabel}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert(
                  'Apple Sign-In',
                  'Para activar Apple Sign-In necesitas configurar Sign in with Apple en tu cuenta de desarrollador.',
                )}
              >
                <Ionicons name="logo-apple" size={20} color={colors.ink} />
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

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
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cloud,
  },
  dividerText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-hint'],
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    gap: spacing.sm,
  },
  socialIcon: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.ink,
  },
  socialLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors.ink,
  },
});
