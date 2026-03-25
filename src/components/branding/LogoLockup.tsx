import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AgaveIcon } from './AgaveIcon';
import { Logo } from './Logo';
import { spacing } from '../../theme';

interface LogoLockupProps {
  size?: 'sm' | 'md' | 'lg';
}

const iconSizes = { sm: 32, md: 48, lg: 72 };

export const LogoLockup: React.FC<LogoLockupProps> = ({ size = 'md' }) => {
  return (
    <View style={styles.container}>
      <AgaveIcon size={iconSizes[size]} />
      <Logo size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
