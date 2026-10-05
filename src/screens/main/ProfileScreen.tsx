import * as Application from 'expo-application';
import Constants from 'expo-constants';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { getPickingPreferences, savePickingPreferences } from '../../services/picking';
import { DEFAULT_PICKING_PREFERENCES } from '../../types/database';
import { deleteAccount } from '../../services/auth';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

interface MenuItemRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  badge?: string;
  showChevron?: boolean;
}

const MenuItemRow = ({
  icon,
  label,
  sublabel,
  onPress,
  color = colors.ink,
  badge,
  showChevron = true,
}: MenuItemRowProps) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconBox, { backgroundColor: color === colors.error ? '#FEE2E2' : colors['agave-light'] }]}>
      <Ionicons name={icon} size={20} color={color === colors.error ? colors.error : colors.agave} />
    </View>

    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={{ alignItems: 'flex-start', gap: 6 }}>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        {badge && (
          <View style={styles.inlineBadge}>
            <Text style={styles.inlineBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
    </View>

    {showChevron && <Ionicons name="chevron-forward" size={18} color={colors['ink-hint']} />}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const { profile, user, isAuthenticated, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [deleting, setDeleting] = useState(false);
  const [subPrefModal, setSubPrefModal] = useState(false);
  const [subPreference, setSubPreference] = useState<'call' | 'replace' | 'cancel'>('call');
  const [paymentModal, setPaymentModal] = useState(false);

  const [savingPreference, setSavingPreference] = useState(false);
  useEffect(() => {
    let active = true;
    if (user?.id) getPickingPreferences(user.id).then(prefs => {
      if (active && prefs) setSubPreference(prefs.on_unavailable === 'substitute' ? 'replace' : prefs.on_unavailable === 'remove' ? 'cancel' : 'call');
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  const selectPreference = async (value: 'call' | 'replace' | 'cancel') => {
    if (!user?.id || savingPreference) return;
    setSavingPreference(true);
    try {
      const saved = await getPickingPreferences(user.id);
      await savePickingPreferences(user.id, { ...(saved ?? DEFAULT_PICKING_PREFERENCES), on_unavailable: value === 'call' ? 'ask_me' : value === 'replace' ? 'substitute' : 'remove' });
      setSubPreference(value);
      setSubPrefModal(false);
    } catch { Alert.alert('No se guardó la preferencia', 'Revisa tu conexión e intenta de nuevo.'); }
    finally { setSavingPreference(false); }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente y requerida por las políticas de Google Play. Se cancelarán tus pedidos pendientes y se eliminarán todos tus datos asociados. ¿Seguro que deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación definitiva',
              'Esta acción no se puede deshacer. ¿Deseas borrar tu cuenta y datos de PideYa ahora?',
              [
                { text: 'No, conservar cuenta', style: 'cancel' },
                {
                  text: 'Sí, eliminar todo',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                    } catch {
                      Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const showTerms = () => {
    Alert.alert(
      'Términos y condiciones',
      'Los términos y condiciones completos de PideYa están disponibles dentro de la aplicación. Al usar PideYa aceptas que la plataforma actúa como intermediario tecnológico para conectar clientes con restaurantes, supermercados y servicios de entrega.',
      [{ text: 'Entendido' }],
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <View style={styles.guestContainer}>
          <Avatar name="?" size={72} />
          <Text style={styles.name}>Invitado</Text>
          <Text style={styles.info}>Inicia sesión para ver tu perfil y guardar tus preferencias</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card Profile */}
        <View style={styles.profileHeaderCard}>
          <Avatar
            name={profile?.full_name ?? 'U'}
            uri={profile?.avatar_url}
            size={76}
          />
          <Text style={styles.name}>{profile?.full_name ?? 'Usuario PideYa'}</Text>
          <Text style={styles.info}>{user?.email || profile?.phone || 'Cliente PideYa'}</Text>

          <View style={styles.vipBadgeChip}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.vipBadgeText}>Cliente Frecuente</Text>
          </View>
        </View>

        {/* Action Sections */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Mi Cuenta y Despensa</Text>

          <MenuItemRow
            icon="location-sharp"
            label="Mis Direcciones Guardadas"
            sublabel="Administra tu casa, trabajo y ubicaciones frecuentes"
            onPress={() => navigation.navigate('AddressPicker' as any)}
          />

          <MenuItemRow
            icon="bookmark-sharp"
            label="Mis Listas de Despensa"
            sublabel="Ver tus listas semanales guardadas para 1-click"
            onPress={() => navigation.navigate('SavedLists')}
          />

          <MenuItemRow
            icon="swap-horizontal-sharp"
            label="Sustituciones en supermercado"
            sublabel={
              subPreference === 'call'
                ? 'Llamarme por teléfono si falta un producto'
                : subPreference === 'replace'
                ? 'Sustituir por producto similar'
                : 'Cancelar producto agotado'
            }
            onPress={() => setSubPrefModal(true)}
          />

          <MenuItemRow
            icon="card-sharp"
            label="Métodos de Pago & Tarjetas"
            sublabel="Efectivo contra entrega activo"
            badge="Tarjetas próximamente"
            onPress={() => setPaymentModal(true)}
          />
        </View>

        {/* Legal & Policies (Google Play Policy Compliance) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Soporte y Legal</Text>

          <MenuItemRow
            icon="help-circle-sharp"
            label="Soporte y Centro de Ayuda"
            sublabel="Chat directo en WhatsApp con el equipo PideYa"
            onPress={() =>
              Linking.openURL('https://wa.me/523781234567?text=Hola,%20necesito%20ayuda%20con%20PideYa')
            }
          />

          <MenuItemRow
            icon="document-text-sharp"
            label="Términos y Condiciones"
            onPress={showTerms}
          />

          <MenuItemRow
            icon="shield-checkmark-sharp"
            label="Aviso de Privacidad"
            onPress={() => Linking.openURL('https://pide-ya.app/aviso-privacidad')}
          />
        </View>

        {/* Session & Account Deletion (Google Play Required) */}
        <View style={styles.sectionContainer}>
          <MenuItemRow
            icon="log-out-sharp"
            label="Cerrar Sesión"
            onPress={handleSignOut}
            color={colors.error}
            showChevron={false}
          />

          <MenuItemRow
            icon="trash-sharp"
            label={deleting ? 'Eliminando...' : 'Eliminar cuenta'}
            sublabel="Borrar todos tus datos de forma permanente"
            onPress={handleDeleteAccount}
            color={colors.error}
            showChevron={false}
          />
        </View>

        <Text style={styles.versionText}>PideYa {Application.nativeApplicationVersion || Constants.expoConfig?.version || ''}{Application.nativeBuildVersion ? ` · ${Application.nativeBuildVersion}` : ''}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Substitution Preference Modal */}
      <Modal visible={subPrefModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sustituciones en supermercado</Text>
            <Text style={styles.modalSub}>
              Elige qué debe hacer el establecimiento cuando un producto de tu supermercado o frutería esté agotado:
            </Text>

            <TouchableOpacity
              style={[styles.prefOption, subPreference === 'call' && styles.prefOptionActive]}
              disabled={savingPreference}
              onPress={() => selectPreference('call')}
            >
              <Ionicons name="call" size={20} color={subPreference === 'call' ? colors.white : colors.agave} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.prefOptionTitle, subPreference === 'call' && styles.prefOptionTitleActive]}>
                  Llamarme por teléfono
                </Text>
                <Text style={[styles.prefOptionDesc, subPreference === 'call' && styles.prefOptionDescActive]}>
                  El establecimiento te llamará antes de reemplazar cualquier item.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.prefOption, subPreference === 'replace' && styles.prefOptionActive]}
              disabled={savingPreference}
              onPress={() => selectPreference('replace')}
            >
              <Ionicons name="swap-horizontal" size={20} color={subPreference === 'replace' ? colors.white : colors.agave} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.prefOptionTitle, subPreference === 'replace' && styles.prefOptionTitleActive]}>
                  Sustituto similar
                </Text>
                <Text style={[styles.prefOptionDesc, subPreference === 'replace' && styles.prefOptionDescActive]}>
                  El establecimiento elegirá la mejor marca o presentación similar.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.prefOption, subPreference === 'cancel' && styles.prefOptionActive]}
              disabled={savingPreference}
              onPress={() => selectPreference('cancel')}
            >
              <Ionicons name="close-circle" size={20} color={subPreference === 'cancel' ? colors.white : colors.agave} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.prefOptionTitle, subPreference === 'cancel' && styles.prefOptionTitleActive]}>
                  Cancelar el producto
                </Text>
                <Text style={[styles.prefOptionDesc, subPreference === 'cancel' && styles.prefOptionDescActive]}>
                  No agregar sustitutos y descontar el item de la cuenta.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSubPrefModal(false)}>
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Method Info Modal */}
      <Modal visible={paymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="card-sharp" size={40} color={colors.agave} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Métodos de Pago PideYa</Text>
            <Text style={[styles.modalSub, { textAlign: 'center', marginBottom: spacing.lg }]}>
              El método de pago disponible es <Text style={{ fontFamily: fonts.outfit.bold, color: colors.agave }}>Efectivo contra entrega</Text>.
              {'\n\n'}
              Próximamente podrás agregar tus tarjetas de Débito y Crédito procesadas con la seguridad global de Stripe.
            </Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setPaymentModal(false)}>
              <Text style={styles.modalPrimaryBtnText}>¡Entendido!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  guestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  profileHeaderCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cloud,
    marginBottom: spacing.md,
  },
  name: {
    fontFamily: fonts.outfit.bold,
    fontSize: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  info: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-secondary'],
  },
  vipBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  vipBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: '#D97706',
  },
  sectionContainer: {
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cloud,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors['ink-muted'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
  },
  menuSublabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  inlineBadge: {
    maxWidth: '100%',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inlineBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 10,
    color: '#D97706',
  },
  versionText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
  },
  modalTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  modalSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  prefOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.snow,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  prefOptionActive: {
    backgroundColor: colors.agave,
    borderColor: colors.agave,
  },
  prefOptionTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.ink,
  },
  prefOptionTitleActive: {
    color: colors.white,
  },
  prefOptionDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-secondary'],
    marginTop: 2,
  },
  prefOptionDescActive: {
    color: colors.white,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  modalCloseBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-muted'],
  },
  modalPrimaryBtn: {
    backgroundColor: colors.agave,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: colors.white,
  },
});
