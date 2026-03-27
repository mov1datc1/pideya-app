import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing, fonts } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'CompleteProfile'>;

export const CompleteProfileScreen: React.FC<Props> = () => {
  const { updateProfile, loading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  const handleComplete = async () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Datos requeridos', 'Ingresa tu nombre y telefono para continuar.');
      return;
    }
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
      });
      // Auth state change will navigate to Main automatically
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Bienvenido a Pide ya!</Text>
            <Text style={styles.subtitle}>Completa tu perfil para hacer tu primer pedido</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nombre completo"
              placeholder="Juan Perez"
              value={fullName}
              onChangeText={(t) => { setFullName(t); clearError(); }}
              autoComplete="name"
            />
            <Input
              label="Telefono"
              placeholder="3781234567"
              value={phone}
              onChangeText={(t) => { setPhone(t); clearError(); }}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Input
              label="Ciudad (opcional)"
              placeholder="Tepatitlan, Arandas, San Julian..."
              value={city}
              onChangeText={setCity}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Comenzar a pedir"
              onPress={handleComplete}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

            <Text style={styles.privacy}>
              Tus datos se usan unicamente para procesar tus pedidos y contactarte si es necesario.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.h2,
    color: colors.ink,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
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
    marginTop: spacing.lg,
  },
  privacy: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-hint'],
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
