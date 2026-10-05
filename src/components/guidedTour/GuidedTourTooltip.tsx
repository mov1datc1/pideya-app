import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fonts } from '../../theme';

const STORAGE_KEY = '@pideya_has_seen_guided_tour_v1';
const { width } = Dimensions.get('window');

interface TourStep {
  stepNumber: number;
  totalSteps: number;
  title: string;
  body: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const tourSteps: TourStep[] = [
  {
    stepNumber: 1,
    totalSteps: 3,
    title: 'Paso 1 de 3: Tu Ubicación de Entrega',
    body: 'Toca aquí para seleccionar o confirmar tu dirección exacta en el mapa. ¡Es indispensable para mostrarte los restaurantes y tiendas con servicio en tu zona!',
    iconName: 'location-sharp',
  },
  {
    stepNumber: 2,
    totalSteps: 3,
    title: 'Paso 2 de 3: Explora por Categorías',
    body: 'Navega rápidamente entre Restaurantes, Supermercado con picking asistido, Fruterías y Farmacias.',
    iconName: 'grid-sharp',
  },
  {
    stepNumber: 3,
    totalSteps: 3,
    title: 'Paso 3 de 3: Haz Tu Pedido y Guarda Listas',
    body: 'Selecciona tu establecimiento favorito, agrega tus productos al carrito y guarda tus listas de despensa semanales.',
    iconName: 'basket-sharp',
  },
];

interface Props {
  onTourComplete?: () => void;
}

export const GuidedTourTooltip: React.FC<Props> = ({ onTourComplete }) => {
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value !== 'true') {
        setVisible(true);
      }
    });
  }, []);

  const handleNext = async () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      await finishTour();
    }
  };

  const handleSkip = async () => {
    await finishTour();
  };

  const finishTour = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    if (onTourComplete) onTourComplete();
  };

  if (!visible) return null;

  const currentStep = tourSteps[currentStepIndex];

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlayContainer}>
        {/* Dimmed backdrop with pointer indicator */}
        <View style={styles.dimmedBackdrop} />

        {/* Floating Tooltip Card */}
        <View style={styles.tooltipCard}>
          {/* Pointer Arrow */}
          <View style={styles.pointerArrow} />

          <View style={styles.tooltipHeaderRow}>
            <View style={styles.stepBadgeChip}>
              <Ionicons name={currentStep.iconName} size={14} color={colors.agave} />
              <Text style={styles.stepBadgeText}>
                {currentStep.stepNumber} de {currentStep.totalSteps}
              </Text>
            </View>

            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Omitir</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
          <Text style={styles.tooltipBody}>{currentStep.body}</Text>

          {/* Footer Controls */}
          <View style={styles.tooltipFooter}>
            <View style={styles.dotsRow}>
              {tourSteps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentStepIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>
                {currentStepIndex === tourSteps.length - 1 ? '¡Entendido!' : 'Siguiente'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start',
    paddingTop: 110,
    paddingHorizontal: spacing.lg,
  },
  dimmedBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,139,122,0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  pointerArrow: {
    position: 'absolute',
    top: -10,
    left: 40,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stepBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors['agave-light'],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  stepBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    color: colors['agave-dark'],
  },
  skipBtn: {
    padding: 4,
  },
  skipBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  tooltipTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  tooltipBody: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-secondary'],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tooltipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.agave,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.silver,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.agave,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  nextBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: colors.white,
  },
});
