import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  stepNumber: string;
  stepBadge: string;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  pillText: string;
}

const slides: Slide[] = [
  {
    key: '1',
    stepNumber: '1',
    stepBadge: 'Paso 1: Tu Ubicación Esencial',
    title: 'Confirma Tu Ubicación',
    subtitle:
      'Ingresa tu dirección para descubrir los restaurantes, supermercados con picking asistido y farmacias que entregan en tu zona.',
    iconName: 'location-sharp',
    pillText: '1: Ubicación',
  },
  {
    key: '2',
    stepNumber: '2',
    stepBadge: 'Paso 2: Explora Todo Tu Municipio',
    title: 'Restaurantes, Súper y Farmacia',
    subtitle:
      'Explora múltiples categorías. Elige tus platillos favoritos o arma tu despensa semanal con preferencias de sustitutos.',
    iconName: 'basket-sharp',
    pillText: '2: Tiendas',
  },
  {
    key: '3',
    stepNumber: '3',
    stepBadge: 'Paso 3: Rastreo en Vivo',
    title: 'Entrega Ultra Rápida a Tu Puerta',
    subtitle:
      'Sigue en vivo la ruta del repartidor en el mapa desde el momento de preparación hasta que llega a tus manos.',
    iconName: 'navigate-sharp',
    pillText: '3: Entrega',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ route, navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    if (route.params?.onComplete) {
      route.params.onComplete();
    }
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        if (index !== activeIndex && index >= 0 && index < slides.length) {
          setActiveIndex(index);
        }
      },
    },
  );

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        {/* Glassmorphic Hero Container */}
        <Animated.View style={[styles.heroCard, { transform: [{ scale }], opacity }]}>
          <View style={styles.stepBadgeChip}>
            <Ionicons name={item.iconName} size={16} color={colors.agave} />
            <Text style={styles.stepBadgeText}>{item.stepBadge}</Text>
          </View>

          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name={item.iconName} size={48} color={colors.agave} />
            </View>
          </View>

          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.brandBadge}>
          <Ionicons name="flash-sharp" size={18} color={colors.agave} />
          <Text style={styles.brandBadgeText}>PideYa</Text>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slides Carousel */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ alignItems: 'center' }}
      />

      {/* Footer Section */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Stepper Progress Indicator Pills (1: Ubicación | 2: Tiendas | 3: Entrega) */}
        <View style={styles.stepperPillsRow}>
          {slides.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.stepperPill, isActive && styles.stepperPillActive]}
                onPress={() => flatListRef.current?.scrollToIndex({ index: i, animated: true })}
                activeOpacity={0.8}
              >
                <Text style={[styles.stepperPillText, isActive && styles.stepperPillTextActive]}>
                  {s.pillText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary CTA Action Button (54px Agave Teal) */}
        <TouchableOpacity style={styles.mainCtaBtn} onPress={handleNext} activeOpacity={0.88}>
          <Ionicons name="location-outline" size={20} color={colors.white} />
          <Text style={styles.mainCtaText}>
            {activeIndex === 0 ? 'Establecer Ubicación y Explorar' : 'Continuar'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>

        {/* Secondary Login / Account Link */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Iniciar Sesión / Crear Cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  brandBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.agave,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.cloud,
    borderRadius: radius.sm,
  },
  skipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-secondary'],
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroCard: {
    width: width - spacing.lg * 2,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45,139,122,0.15)',
    shadowColor: '#2D8B7A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  stepBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors['agave-light'],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  stepBadgeText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: colors['agave-dark'],
  },
  iconCircleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(45,139,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  slideTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  stepperPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepperPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cloud,
  },
  stepperPillActive: {
    backgroundColor: colors.agave,
  },
  stepperPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors['ink-secondary'],
  },
  stepperPillTextActive: {
    fontFamily: fonts.outfit.bold,
    color: colors.white,
  },
  mainCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    backgroundColor: colors.agave,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#2D8B7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  mainCtaText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.white,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.agave,
  },
});
