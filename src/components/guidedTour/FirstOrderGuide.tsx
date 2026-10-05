import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, spacing } from '../../theme';
import { GuideStage, GUIDE_STAGES, nextGuideStage, readGuideProgress } from '../../utils/firstOrderGuide';

type Progress = { stage: GuideStage; hidden: boolean };
type Guide = Progress & { loaded: boolean; advance: (stage: GuideStage) => void; hide: () => void };
const Context = createContext<Guide>({ stage: 'location', hidden: false, loaded: false, advance: () => {}, hide: () => {} });
export const useFirstOrderGuide = () => useContext(Context);

export function FirstOrderGuideProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const key = user?.id ? `@pideya/first-order/v2/${user.id}` : null;
  const [state, setState] = useState<Progress & { key: string | null; loaded: boolean }>({ key: null, stage: 'location', hidden: false, loaded: false });
  const current = useRef(state);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    current.current = { key, stage: 'location', hidden: false, loaded: false };
    setState(current.current);
    if (key) AsyncStorage.getItem(key).then(raw => {
      if (active) { current.current = { ...readGuideProgress(raw), key, loaded: true }; setState(current.current); }
    }).catch(() => {
      if (active) { current.current = { key, stage: 'location', hidden: false, loaded: true }; setState(current.current); }
    });
    return () => { active = false; };
  }, [key]);
  const update = useCallback((stage?: GuideStage, hide = false) => {
    if (!key || current.current.key !== key || !current.current.loaded) return;
    const previous = current.current;
    const next = { ...previous, stage: stage ? nextGuideStage(previous.stage, stage) : previous.stage, hidden: hide || previous.hidden };
    if (next.stage === previous.stage && next.hidden === previous.hidden) return;
    current.current = next;
    setState(next);
    pending.current = pending.current.catch(() => {}).then(() => AsyncStorage.setItem(key, JSON.stringify({ stage: next.stage, hidden: next.hidden }))).catch(() => {});
  }, [key]);
  const advance = useCallback((stage: GuideStage) => update(stage), [update]);
  const hide = useCallback(() => update(undefined, true), [update]);
  return <Context.Provider value={{ ...state, loaded: state.key === key && state.loaded, advance, hide }}>{children}</Context.Provider>;
}

const COPY: Record<string, { title: string; body: string; icon: keyof typeof Ionicons.glyphMap }> = {
  category: { title: 'Tu dirección está lista. ¿Qué necesitas?', body: 'Elige una categoría. Verás los establecimientos que pueden entregar en tu ubicación.', icon: 'grid-outline' },
  store: { title: 'Elige dónde pedir', body: 'Abre un establecimiento de esta categoría para ver sus productos y opciones.', icon: 'storefront-outline' },
  products: { title: 'Arma tu primer pedido', body: 'Toca Agregar, elige las opciones y ajusta la cantidad. Cuando esté listo, abre tu carrito.', icon: 'basket-outline' },
  cart: { title: 'Revisa antes de continuar', body: 'Comprueba productos, cantidades y notas. Después toca Continuar para elegir entrega y pago.', icon: 'cart-outline' },
  checkout: { title: 'Todo listo para confirmar', body: 'Revisa dirección, forma de pago y total. Solo se enviará el pedido cuando toques Confirmar pedido.', icon: 'checkmark-circle-outline' },
};
export function FirstOrderGuideCard({ stage }: { stage: Exclude<GuideStage, 'location' | 'done'> }) {
  const guide = useFirstOrderGuide();
  if (!guide.loaded || guide.hidden || guide.stage === 'done') return null;
  const copy = COPY[stage];
  const step = GUIDE_STAGES.indexOf(stage) + 1;
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <View style={styles.row}>
      <View style={styles.badge}><Ionicons name={copy.icon} size={17} color={colors.agave} /><Text style={styles.eyebrow}>TU PRIMER PEDIDO · {step} DE 6</Text></View>
      <TouchableOpacity onPress={guide.hide} accessibilityRole="button" accessibilityLabel="Ocultar guía del primer pedido" style={styles.close}><Ionicons name="close" size={20} color={colors['ink-secondary']} /></TouchableOpacity>
    </View>
    <Text style={styles.title}>{copy.title}</Text>
    <Text style={styles.body}>{copy.body}</Text>
    <View style={styles.track}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.segment, index < step && { backgroundColor: colors.agave }]} />)}</View>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.lg, backgroundColor: colors['agave-light'], borderRadius: 20, borderWidth: 1, borderColor: colors['agave-soft'], marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  eyebrow: { fontFamily: fonts.outfit.bold, fontSize: 10, color: colors['agave-dark'], flexShrink: 1, letterSpacing: 0.5 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.outfit.bold, color: '#1E293B', fontSize: 21, marginBottom: 8 },
  body: { fontFamily: fonts.outfit.regular, color: colors['ink-secondary'], fontSize: 14, lineHeight: 21 },
  track: { flexDirection: 'row', gap: 5, marginTop: spacing.md },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors['agave-soft'] },
});
