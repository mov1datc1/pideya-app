import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, textStyles } from '../theme';

/** Keep a render failure in one tab from taking down the whole React tree. */
export class ScreenErrorBoundary extends React.Component<React.PropsWithChildren<{ screen: string }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[PideYa:${this.props.screen}]`, error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.white }}>
      <Text style={[textStyles.body, { textAlign: 'center' }]}>No pudimos mostrar {this.props.screen.toLowerCase()}. Intenta de nuevo.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={{ padding: spacing.lg }}>
        <Text style={[textStyles.body, { color: colors.agave }]}>Reintentar</Text>
      </TouchableOpacity>
    </View>;
  }
}
