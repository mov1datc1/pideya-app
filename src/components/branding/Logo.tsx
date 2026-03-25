import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const fontSizes = { sm: 20, md: 28, lg: 38 };

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  color = colors.agave,
}) => {
  const fontSize = fontSizes[size];

  return (
    <View style={styles.row}>
      <Text style={[styles.pide, { fontSize, color }]}>Pide </Text>
      <Text style={[styles.ya, { fontSize, color: colors.tierra }]}>ya</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pide: {
    fontFamily: fonts.playfair.bold,
  },
  ya: {
    fontFamily: fonts.playfair.italic,
  },
});
