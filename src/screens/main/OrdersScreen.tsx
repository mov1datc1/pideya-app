import React from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { colors, textStyles, spacing, fonts } from '../../theme';
import { formatPrice } from '../../utils/formatPrice';
import type { Order } from '../../types/database';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  ON_THE_WAY: 'En camino',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.warning,
  ACCEPTED: colors.agave,
  ON_THE_WAY: colors.tierra,
  DELIVERED: colors['agave-dark'],
  REJECTED: colors.error,
  CANCELLED: colors['ink-muted'],
};

export const OrdersScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { orders, loading, error } = useOrders(phone);

  const renderOrder = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Pedido #{item.order_number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] ?? colors['ink-muted'] },
          ]}
        >
          <Text style={styles.statusText}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.orderItems}>
        {item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
      </Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatPrice(item.total)}</Text>
        <Text style={styles.orderDate}>
          {new Date(item.created_at).toLocaleDateString('es-MX')}
        </Text>
      </View>
    </Card>
  );

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Inicia sesion para ver tus pedidos
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Mis pedidos</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.agave} style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aun no tienes pedidos</Text>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    ...textStyles.h1,
    color: colors.ink,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  orderCard: {
    gap: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.white,
  },
  orderItems: {
    ...textStyles.caption,
    color: colors['ink-secondary'],
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 17,
    color: colors.ink,
  },
  orderDate: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
  loader: {
    marginTop: spacing['4xl'],
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...textStyles.body,
    color: colors['ink-muted'],
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
});
