import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AgaveIcon } from '../../components/branding/AgaveIcon';
import { Button } from '../../components/ui/Button';
import { colors, spacing, textStyles, radius } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  iconColor: string;
}

const slides: Slide[] = [
  {
    key: '1',
    title: 'Tus favoritos\na un toque',
    subtitle: 'Tacos, tortas, sushi y mas de Los Altos directo a tu puerta.',
    iconColor: colors.agave,
  },
  {
    key: '2',
    title: 'Rapido\ny seguro',
    subtitle: 'Sigue tu pedido en tiempo real desde la cocina hasta tu mesa.',
    iconColor: colors.tierra,
  },
  {
    key: '3',
    title: 'Paga como\nquieras',
    subtitle: 'Efectivo, tarjeta u OXXO. Tu decides.',
    iconColor: colors['agave-dark'],
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleGetStarted = () => {
    // TODO: Navigate to Login when ready
    navigation.replace('Login');
  };

  const isLast = activeIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleGetStarted();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <AgaveIcon size={100} color={item.iconColor} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
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

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button
          title={isLast ? 'Comenzar' : 'Siguiente'}
          onPress={handleNext}
          size="lg"
          style={styles.btn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingTop: 100,
  },
  title: {
    ...textStyles.h1,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.silver,
  },
  dotActive: {
    backgroundColor: colors.agave,
    width: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  btn: {
    borderRadius: radius.sm,
  },
});
