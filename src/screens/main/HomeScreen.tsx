import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { LogoLockup } from '../../components/branding/LogoLockup';
import { colors, textStyles, spacing } from '../../theme';

export const HomeScreen: React.FC = () => {
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <LogoLockup size="sm" />
      </View>
      <View style={styles.content}>
        <Text style={styles.greeting}>Buen dia</Text>
        <Text style={styles.subtitle}>Que se te antoja hoy?</Text>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  content: {
    paddingTop: spacing['2xl'],
  },
  greeting: {
    ...textStyles.h1,
    color: colors.ink,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
  },
});
