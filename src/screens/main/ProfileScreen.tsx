import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing } from '../../theme';

export const ProfileScreen: React.FC = () => {
  const { profile, user, isAuthenticated, signOut, loading } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Avatar name="?" size={64} />
          <Text style={styles.name}>Invitado</Text>
          <Text style={styles.info}>Inicia sesion para ver tu perfil</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Avatar
          name={profile?.full_name ?? 'U'}
          uri={profile?.avatar_url}
          size={64}
        />
        <Text style={styles.name}>{profile?.full_name ?? 'Usuario'}</Text>
        <Text style={styles.info}>{user?.email}</Text>
        {profile?.phone && <Text style={styles.info}>{profile.phone}</Text>}
        {profile?.city && <Text style={styles.town}>{profile.city}</Text>}
      </View>

      <View style={styles.actions}>
        <Button
          title="Cerrar sesion"
          variant="outline"
          onPress={handleSignOut}
          loading={loading}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.sm,
  },
  name: {
    ...textStyles.h2,
    color: colors.ink,
  },
  info: {
    ...textStyles.body,
    color: colors['ink-secondary'],
  },
  town: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
  actions: {
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
});
