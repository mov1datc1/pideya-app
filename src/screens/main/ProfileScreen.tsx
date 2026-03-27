import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';

interface MenuItemRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

const MenuItemRow = ({ icon, label, onPress, color = colors.ink, showChevron = true }: MenuItemRowProps) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
    <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    {showChevron && <Ionicons name="chevron-forward" size={18} color={colors['ink-hint']} />}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const { profile, user, isAuthenticated, signOut, loading } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const showTerms = () => {
    Alert.alert(
      'Terminos y condiciones',
      'Los terminos y condiciones completos de Pide ya estan disponibles dentro de la aplicacion. Al usar Pide ya aceptas que la plataforma actua como intermediario tecnologico y no es responsable de la calidad de los alimentos ni del servicio de entrega de los restaurantes.',
      [{ text: 'Entendido' }],
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <View style={styles.headerSection}>
          <Avatar name="?" size={64} />
          <Text style={styles.name}>Invitado</Text>
          <Text style={styles.info}>Inicia sesion para ver tu perfil</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.headerSection}>
          <Avatar
            name={profile?.full_name ?? 'U'}
            uri={profile?.avatar_url}
            size={72}
          />
          <Text style={styles.name}>{profile?.full_name ?? 'Usuario'}</Text>
          <Text style={styles.info}>{user?.email}</Text>
          {profile?.phone && <Text style={styles.info}>{profile.phone}</Text>}
          {profile?.city && <Text style={styles.town}>{profile.city}</Text>}
        </View>

        {/* Menu items */}
        <View style={styles.menuSection}>
          <MenuItemRow
            icon="document-text-outline"
            label="Terminos y condiciones"
            onPress={showTerms}
          />
          <MenuItemRow
            icon="shield-checkmark-outline"
            label="Privacidad"
            onPress={() => Alert.alert('Privacidad', 'No vendemos ni compartimos tus datos personales con terceros. Solo usamos tu informacion para procesar pedidos.')}
          />
          <MenuItemRow
            icon="help-circle-outline"
            label="Ayuda y soporte"
            onPress={() => Linking.openURL('https://wa.me/523781234567?text=Hola,%20necesito%20ayuda%20con%20Pide%20ya')}
          />
        </View>

        <View style={styles.menuSection}>
          <MenuItemRow
            icon="log-out-outline"
            label="Cerrar sesion"
            onPress={handleSignOut}
            color={colors.error}
            showChevron={false}
          />
        </View>

        <Text style={styles.version}>Pide ya v1.0.0</Text>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  name: {
    ...textStyles.h2,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  info: {
    ...textStyles.body,
    color: colors['ink-secondary'],
  },
  town: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
  menuSection: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cloud,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  menuLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    flex: 1,
  },
  version: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-hint'],
    textAlign: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing['4xl'],
  },
});
