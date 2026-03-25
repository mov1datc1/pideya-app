import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
}) => {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, containerStyle]} />;
  }

  return (
    <View style={[styles.fallback, containerStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.cloud,
  },
  fallback: {
    backgroundColor: colors['agave-soft'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.outfit.semiBold,
    color: colors['agave-dark'],
  },
});
