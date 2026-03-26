import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRestaurantMenu } from '../../hooks/useRestaurants';
import { useCart } from '../../hooks/useCart';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { MenuItem, MenuItemOption } from '../../types/database';
import * as restaurantService from '../../services/restaurants';

type RouteType = RouteProp<RootStackParamList, 'RestaurantDetail'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

export const RestaurantDetailScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { restaurantId, restaurantName, coverUrl } = route.params;
  const { items, categories, loading, error } = useRestaurantMenu(restaurantId);
  const { addItem, itemCount, itemsTotal, cart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemOptions, setItemOptions] = useState<MenuItemOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<MenuItemOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const filteredItems = selectedCategory
    ? items.filter((i) => i.category === selectedCategory)
    : items;

  const openItemDetail = useCallback(async (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes('');
    setSelectedOptions([]);
    setLoadingOptions(true);
    try {
      const opts = await restaurantService.getMenuItemOptions(item.id);
      setItemOptions(opts);
    } catch {
      setItemOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const toggleOption = (opt: MenuItemOption) => {
    setSelectedOptions((prev) =>
      prev.find((o) => o.id === opt.id)
        ? prev.filter((o) => o.id !== opt.id)
        : [...prev, opt],
    );
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    if (cart.restaurant_id && cart.restaurant_id !== restaurantId && cart.items.length > 0) {
      Alert.alert(
        'Cambiar restaurante?',
        'Tu carrito tiene productos de otro restaurante. Se vaciara si agregas este producto.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Vaciar y agregar',
            style: 'destructive',
            onPress: () => {
              addItem(restaurantId, restaurantName, selectedItem, quantity, notes, selectedOptions);
              setSelectedItem(null);
            },
          },
        ],
      );
      return;
    }
    addItem(restaurantId, restaurantName, selectedItem, quantity, notes, selectedOptions);
    setSelectedItem(null);
  };

  const optionsPrice = selectedOptions.reduce((s, o) => s + o.price, 0);
  const itemTotal = selectedItem ? (selectedItem.price + optionsPrice) * quantity : 0;

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => openItemDetail(item)} activeOpacity={0.7}>
      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
        {item.is_promo && item.promo_description ? (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>{item.promo_description}</Text>
          </View>
        ) : null}
      </View>
      {item.photo_url_1 ? (
        <Image source={{ uri: item.photo_url_1 }} style={styles.menuItemImage} />
      ) : (
        <View style={[styles.menuItemImage, styles.menuItemPlaceholder]}>
          <Ionicons name="fast-food-outline" size={24} color={colors['ink-hint']} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCategoryHeader = (category: string) => (
    <Text style={styles.categoryHeader} key={category}>{category}</Text>
  );

  // Group items by category for display
  const groupedData: { category: string; items: MenuItem[] }[] = [];
  const displayCategories = selectedCategory ? [selectedCategory] : categories;
  displayCategories.forEach((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) {
      groupedData.push({ category: cat, items: catItems });
    }
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with cover image */}
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: colors.agave }]} />
        )}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Restaurant name */}
      <View style={styles.titleSection}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>
      </View>

      {/* Category filter */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          <TouchableOpacity
            style={[styles.catChip, !selectedCategory && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>
              Todo
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Menu items */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.agave} style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {groupedData.map((group) => (
            <View key={group.category}>
              {renderCategoryHeader(group.category)}
              {group.items.map((item) => (
                <View key={item.id}>{renderMenuItem({ item })}</View>
              ))}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Cart floating bar */}
      {itemCount > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { bottom: insets.bottom + 16 }]}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemCount}</Text>
          </View>
          <Text style={styles.cartBarText}>Ver carrito</Text>
          <Text style={styles.cartBarPrice}>${itemsTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Item detail modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedItem.photo_url_1 ? (
                  <Image source={{ uri: selectedItem.photo_url_1 }} style={styles.modalImage} />
                ) : null}

                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                {selectedItem.description ? (
                  <Text style={styles.modalItemDesc}>{selectedItem.description}</Text>
                ) : null}
                <Text style={styles.modalItemPrice}>${selectedItem.price.toFixed(2)}</Text>

                {selectedItem.is_combo && selectedItem.combo_description ? (
                  <View style={styles.comboBadge}>
                    <Ionicons name="gift-outline" size={14} color={colors.agave} />
                    <Text style={styles.comboText}>{selectedItem.combo_description}</Text>
                  </View>
                ) : null}

                {/* Options */}
                {loadingOptions ? (
                  <ActivityIndicator color={colors.agave} style={{ marginTop: spacing.lg }} />
                ) : itemOptions.length > 0 ? (
                  <View style={styles.optionsSection}>
                    <Text style={styles.optionsTitle}>Extras / Opciones</Text>
                    {itemOptions.map((opt) => {
                      const isSelected = selectedOptions.some((o) => o.id === opt.id);
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={styles.optionRow}
                          onPress={() => toggleOption(opt)}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isSelected ? colors.agave : colors['ink-hint']}
                          />
                          <Text style={styles.optionLabel}>{opt.label}</Text>
                          {opt.price > 0 && (
                            <Text style={styles.optionPrice}>+${opt.price.toFixed(2)}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {/* Quantity */}
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Cantidad</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.ink} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setQuantity((q) => q + 1)}
                    >
                      <Ionicons name="add" size={20} color={colors.ink} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Add to cart button */}
            <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
              <Text style={styles.addToCartText}>
                Agregar ${itemTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 180,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  restaurantName: {
    ...textStyles.h2,
    color: colors.ink,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.lg,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.cloud,
  },
  catChipActive: {
    backgroundColor: colors.agave,
  },
  catChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-secondary'],
  },
  catChipTextActive: {
    color: colors.white,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  categoryHeader: {
    ...textStyles.h3,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  menuItemName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  menuItemDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
    marginTop: 2,
  },
  menuItemPrice: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 16,
    color: colors.agave,
    marginTop: spacing.xs,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
  },
  menuItemPlaceholder: {
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBadge: {
    backgroundColor: colors['warning-bg'],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  promoText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.warning,
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
  // Cart floating bar
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.agave,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors['agave-dark'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cartBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.white,
  },
  cartBarText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    flex: 1,
  },
  cartBarPrice: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 16,
    color: colors.white,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.silver,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  modalItemName: {
    ...textStyles.h2,
    color: colors.ink,
  },
  modalItemDesc: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
  },
  modalItemPrice: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 22,
    color: colors.agave,
    marginTop: spacing.sm,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors['agave-light'],
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  comboText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['agave-dark'],
  },
  optionsSection: {
    marginTop: spacing.xl,
  },
  optionsTitle: {
    ...textStyles.h3,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  optionLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  optionPrice: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
  },
  quantityLabel: {
    ...textStyles.h3,
    color: colors.ink,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: colors.ink,
  },
  addToCartBtn: {
    backgroundColor: colors.agave,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  addToCartText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.white,
  },
});
