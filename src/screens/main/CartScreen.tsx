import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { CartItem } from '../../types/database';

type NavType = NativeStackNavigationProp<RootStackParamList>;

/** Build a WhatsApp-friendly text summary of the cart */
const buildCartShareText = (restaurantName: string, items: CartItem[], total: number): string => {
  let text = `🛒 *Mi pedido de ${restaurantName}*\n`;
  text += `━━━━━━━━━━━━━━\n`;
  items.forEach((item) => {
    const optionsPrice = item.selected_options.reduce((s, o) => s + o.price, 0);
    const lineTotal = (item.menu_item.price + optionsPrice) * item.quantity;
    text += `${item.quantity}x ${item.menu_item.name} — $${lineTotal.toFixed(2)}\n`;
    if (item.selected_options.length > 0) {
      text += `   ${item.selected_options.map((o) => o.label).join(', ')}\n`;
    }
    if (item.notes) {
      text += `   📝 ${item.notes}\n`;
    }
  });
  text += `━━━━━━━━━━━━━━\n`;
  text += `💰 *Total: $${total.toFixed(2)}*\n\n`;
  text += `Hecho con *Pide ya* 🌮`;
  return text;
};

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const {
    cart,
    removeItem,
    updateQuantity,
    clearCart,
    itemsTotal,
    itemCount,
    isEmpty,
  } = useCart();

  const handleClear = () => {
    Alert.alert('Vaciar carrito', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleShareWhatsApp = () => {
    const text = buildCartShareText(cart.restaurant_name, cart.items, itemsTotal);
    const encoded = encodeURIComponent(text);
    const url = `whatsapp://send?text=${encoded}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to generic share
        Share.share({ message: text });
      }
    });
  };

  const handleShare = () => {
    const text = buildCartShareText(cart.restaurant_name, cart.items, itemsTotal);
    Share.share({ message: text });
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const optionsPrice = item.selected_options.reduce((s, o) => s + o.price, 0);
    const lineTotal = (item.menu_item.price + optionsPrice) * item.quantity;

    return (
      <View style={styles.cartItem}>
        {item.menu_item.photo_url_1 ? (
          <Image source={{ uri: item.menu_item.photo_url_1 }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemPlaceholder]}>
            <Ionicons name="fast-food-outline" size={20} color={colors['ink-hint']} />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.menu_item.name}</Text>
          {item.selected_options.length > 0 && (
            <Text style={styles.itemOptions}>
              {item.selected_options.map((o) => o.label).join(', ')}
            </Text>
          )}
          {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
          <Text style={styles.itemPrice}>${lineTotal.toFixed(2)}</Text>
        </View>

        <View style={styles.qtyControls}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.menu_item.id, item.quantity - 1, item.menu_item.name)}
          >
            <Ionicons
              name={item.quantity === 1 ? 'trash-outline' : 'remove'}
              size={16}
              color={item.quantity === 1 ? colors.error : colors.ink}
            />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.menu_item.id, item.quantity + 1, item.menu_item.name)}
          >
            <Ionicons name="add" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tu carrito</Text>
        {!isEmpty && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShareWhatsApp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="share-outline" size={22} color={colors.agave} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Vaciar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors['ink-hint']} />
          <Text style={styles.emptyTitle}>Tu carrito esta vacio</Text>
          <Text style={styles.emptySubtitle}>Agrega productos de un restaurante</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.browseBtnText}>Explorar restaurantes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Restaurant name */}
          <View style={styles.restaurantRow}>
            <Ionicons name="restaurant-outline" size={18} color={colors.agave} />
            <Text style={styles.restaurantName}>{cart.restaurant_name}</Text>
          </View>

          {/* Items list */}
          <FlatList
            data={cart.items}
            renderItem={renderItem}
            keyExtractor={(item, idx) => `${item.menu_item.id}-${idx}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          {/* Summary */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({itemCount} productos)</Text>
              <Text style={styles.summaryValue}>${itemsTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Envio</Text>
              <Text style={styles.summaryValue}>Se calcula al pagar</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total estimado</Text>
              <Text style={styles.totalValue}>${itemsTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('Checkout')}
              activeOpacity={0.9}
            >
              <Text style={styles.checkoutBtnText}>Continuar al pago</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.ink,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  clearText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.error,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors['agave-light'],
  },
  restaurantName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors['agave-dark'],
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  itemPlaceholder: {
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  itemOptions: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 2,
  },
  itemNotes: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-hint'],
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPrice: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 15,
    color: colors.agave,
    marginTop: spacing.xs,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  summaryValue: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fonts.playfair.bold,
    fontSize: 20,
    color: colors.agave,
  },
  checkoutBtn: {
    backgroundColor: colors.agave,
    height: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkoutBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.white,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...textStyles.body,
    color: colors['ink-muted'],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  browseBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.agave,
    paddingHorizontal: spacing['2xl'],
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.white,
  },
});
