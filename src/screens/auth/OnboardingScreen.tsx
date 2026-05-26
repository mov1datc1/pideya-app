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
import { colors, spacing, textStyles, radius, fonts } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

const { width, height } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

const slides: Slide[] = [
  {
    key: '1',
    title: 'Busca y Elige',
    subtitle: 'Encuentra tus restaurantes, farmacias y tiendas favoritas en un solo lugar.',
    emoji: '🛍️',
    color: '#FF6B6B',
  },
  {
    key: '2',
    title: 'Arma tu Pedido',
    subtitle: 'Agrega productos y personalízalos a tu gusto (¡comida o despensa!).',
    emoji: '🛒',
    color: '#4ECDC4',
  },
  {
    key: '3',
    title: 'Entrega Flash',
    subtitle: 'Sigue a tu repartidor en el mapa en tiempo real hasta que llegue a tus manos.',
    emoji: '🛵',
    color: '#FFD166',
  },
  {
    key: '4',
    title: '¡Plug & Play!',
    subtitle: 'Paga en efectivo, OXXO o tarjeta. Así de fácil, tu comida lista para disfrutar.',
    emoji: '🎉',
    color: '#45B7D1',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ route }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    // Notify AppNavigator that onboarding is complete
    if (route.params?.onComplete) {
      route.params.onComplete();
    }
  };

  const isLast = activeIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleGetStarted();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
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
    }
  );

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, -50],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View
          style={[
            styles.emojiContainer,
            {
              backgroundColor: item.color + '20',
              transform: [{ translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
        </Animated.View>
        <Animated.View style={[styles.textContainer, { opacity, transform: [{ translateY }] }]}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background color transition based on scroll */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: scrollX.interpolate({
              inputRange: slides.map((_, i) => i * width),
              outputRange: slides.map((s) => s.color + '10'),
            }),
          },
        ]}
      />

      {/* Skip Button */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>

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
      />

      {/* Footer (Dots + Button) */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
        <View style={styles.dotsContainer}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: slides[i].color }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: slides[activeIndex].color }]}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.mainBtnText}>{isLast ? '¡Empezar a pedir!' : 'Siguiente'}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={20} color={colors.white} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors['ink-muted'],
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emojiContainer: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  emoji: {
    fontSize: 100,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...textStyles.h1,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing['2xl'],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  mainBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.white,
  },
});
