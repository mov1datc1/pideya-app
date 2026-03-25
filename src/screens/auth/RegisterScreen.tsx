import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Logo } from '../../components/branding/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { signUp, loading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      Alert.alert('Error', 'Llena todos los campos obligatorios');
      return;
    }
    try {
      await signUp(email.trim(), password, fullName.trim(), phone.trim(), city.trim());
      Alert.alert('Cuenta creada', 'Revisa tu email para confirmar tu cuenta', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch {
      // error se maneja en el hook
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
            <Logo size="md" />
            <Text style={styles.subtitle}>Crea tu cuenta</Text>
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
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
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
              placeholder="Tepatitlan, Arandas..."
              value={city}
              onChangeText={setCity}
            />
            <Input
              label="Contraseña"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Registrarme"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

            <Button
              title="Ya tengo cuenta"
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
            />
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
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.sm,
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
