import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Avatar } from '../../components/ui/Avatar';
import { colors, textStyles, spacing } from '../../theme';

export const ProfileScreen: React.FC = () => {
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Avatar name="Usuario" size={64} />
        <Text style={styles.name}>Usuario</Text>
        <Text style={styles.town}>Tepatitlan</Text>
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
  town: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
});
