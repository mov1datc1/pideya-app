import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../theme';

export function LocationSetup({ onLocate, onManual, loading, error, onRetry }: { onLocate: () => void; onManual: () => void; loading: boolean; error?: string | null; onRetry: () => void }) {
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.art}><View style={styles.halo}><Ionicons name="home" size={54} color={colors.agave} /></View><View style={styles.pin}><Ionicons name="location" size={30} color={colors.white} /></View></View>
    <Text style={styles.step}>EMPECEMOS · PASO 1 DE 6</Text>
    <Text style={styles.title}>Tu primer pedido empieza aquí.</Text>
    <Text style={styles.body}>Guarda dónde quieres recibirlo. Así te mostraremos restaurantes y tiendas que sí llegan a ti.</Text>
    <View style={styles.checklist}>
      {['Ubica la entrada en el mapa', 'Confirma calle y número', 'Guárdala como Casa, Trabajo u Otro'].map((text, i) => <View key={text} style={styles.row}><View style={styles.number}><Text style={styles.numberText}>{i + 1}</Text></View><Text style={styles.item}>{text}</Text></View>)}
    </View>
    {error ? <View accessibilityRole="alert"><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={onRetry} style={styles.secondary}><Text style={styles.link}>Volver a cargar mis direcciones</Text></TouchableOpacity></View> : null}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Configurar mi dirección usando mi ubicación" style={styles.primary} onPress={onLocate} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="locate" size={22} color={colors.white} /><Text style={styles.primaryText}>Usar mi ubicación</Text></>}
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={onManual} disabled={loading}><Text style={styles.link}>Buscar dirección en el mapa</Text><Ionicons name="arrow-forward" size={18} color={colors.agave} /></TouchableOpacity>
    <Text style={styles.footnote}>Puedes configurarla sin dar acceso al GPS. Podrás cambiarla cuando quieras.</Text>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.sm },
  art: { alignSelf: 'center', marginBottom: 24 }, halo: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors['agave-light'], alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#F3FAF8' },
  pin: { position: 'absolute', bottom: 0, right: -8, backgroundColor: colors.agave, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  step: { fontFamily: fonts.outfit.bold, fontSize: 11, letterSpacing: 1.5, color: colors.agave, marginBottom: 12 },
  title: { fontFamily: fonts.outfit.bold, fontSize: 32, lineHeight: 37, color: '#1E293B', marginBottom: 12 },
  body: { fontFamily: fonts.outfit.regular, fontSize: 16, lineHeight: 24, color: colors['ink-secondary'] },
  checklist: { gap: 12, marginVertical: 24 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors['agave-light'], alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: fonts.outfit.bold, color: colors.agave }, item: { flex: 1, fontFamily: fonts.outfit.medium, fontSize: 14, color: '#1E293B' },
  primary: { minHeight: 56, borderRadius: 16, backgroundColor: colors.agave, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14 },
  primaryText: { fontFamily: fonts.outfit.bold, fontSize: 16, color: colors.white, flexShrink: 1 },
  secondary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  link: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.agave, flexShrink: 1 },
  footnote: { fontFamily: fonts.outfit.regular, fontSize: 12, lineHeight: 18, color: colors['ink-secondary'], textAlign: 'center' },
  error: { color: colors.error, fontFamily: fonts.outfit.medium, fontSize: 14 },
});
