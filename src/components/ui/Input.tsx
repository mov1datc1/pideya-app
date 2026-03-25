import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors, spacing, radius, fonts } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...rest }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors['ink-hint']}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.error : undefined,
          style,
        ]}
        {...rest}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-secondary'],
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.snow,
    borderWidth: 1.5,
    borderColor: colors.silver,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 48,
  },
  focused: {
    borderColor: colors.agave,
    backgroundColor: colors.white,
  },
  error: {
    borderColor: colors.error,
  },
  errorText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
