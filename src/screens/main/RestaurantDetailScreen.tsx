import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRestaurantMenu } from '../../hooks/useRestaurants';
import { useCart } from '../../hooks/useCart';
import { FirstOrderGuideCard, useFirstOrderGuide } from '../../components/guidedTour/FirstOrderGuide';
import { useAuth } from '../../hooks/useAuth';
import * as savedListsService from '../../services/savedLists';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { MenuItem, MenuItemOption } from '../../types/database';
import * as restaurantService from '../../services/restaurants';
import { getFlowTypeForRestaurant } from '../../services/picking';

type RouteType = RouteProp<RootStackParamList, 'RestaurantDetail'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

/**
 * Classify options using the DB option_type field.
 * Falls back to price heuristic if option_type is missing (old data).
 */
const classifyOptions = (options: MenuItemOption[], basePrice: number) => {
  const sizes: MenuItemOption[] = [];
  const extras: MenuItemOption[] = [];

  for (const opt of options) {
    if (opt.option_type === 'size') {
      sizes.push(opt);
    } else if (opt.option_type === 'extra') {
      extras.push(opt);
    } else {
      // Fallback heuristic for old data without option_type
      if (opt.price >= basePrice * 0.8) {
        sizes.push(opt);
      } else {
        extras.push(opt);
      }
    }
  }

  // Only treat as sizes if there are 2+ variants
  if (sizes.length >= 2) return { sizes, extras };
  if (sizes.length === 1) return { sizes: [], extras: [...sizes, ...extras] };
  return { sizes: [], extras };
};

export const RestaurantDetailScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const guide = useFirstOrderGuide();
  React.useEffect(() => { if (guide.loaded) guide.advance('products'); }, [guide.loaded, guide.advance]);
  const { restaurantId, restaurantName, restaurantType, coverUrl } = route.params;

  const [storeFlow, setStoreFlow] = useState<{ id: string; picking: boolean } | null>(null);
  const isPickingStore = storeFlow?.id === restaurantId && storeFlow.picking;
  const isRestaurant = !isPickingStore;

  React.useEffect(() => {
    let active = true;
    getFlowTypeForRestaurant(restaurantId).then((flow) => {
      if (active) setStoreFlow({ id: restaurantId, picking: flow === 'picked' || flow === 'pharmacy' });
    });
    return () => { active = false; };
  }, [restaurantId]);

  const notesPlaceholder = isRestaurant 
    ? 'Ej: sin cebolla, extra picante...' 
    : 'Ej: maduros, verdes, especificaciones...';
  const { items, categories, loading, error } = useRestaurantMenu(restaurantId);
  const { addItem, updateQuantity, itemCount, itemsTotal, cart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemOptions, setItemOptions] = useState<MenuItemOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<MenuItemOption | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<MenuItemOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [savingList, setSavingList] = useState(false);

  const getItemQtyInCart = useCallback(
    (itemId: string) => {
      const found = cart.items.find((i) => i.menu_item.id === itemId);
      return found ? found.quantity : 0;
    },
    [cart.items],
  );

  const handleQuickAdd = useCallback(
    (item: MenuItem) => {
      addItem(restaurantId, restaurantName, item, 1, '', []);
    },
    [restaurantId, restaurantName, addItem],
  );

  const handleQuickIncrement = useCallback(
    (item: MenuItem, currentQty: number) => {
      updateQuantity(item.id, currentQty + 1);
    },
    [updateQuantity],
  );

  const handleQuickDecrement = useCallback(
    (item: MenuItem, currentQty: number) => {
      updateQuantity(item.id, currentQty - 1);
    },
    [updateQuantity],
  );

  const handleSaveList = useCallback(async () => {
    if (cart.items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos a tu carrito antes de guardar la lista.');
      return;
    }
    setSavingList(true);
    try {
      const listItems = cart.items.map((i) => ({
        id: i.menu_item.id,
        item_id: i.menu_item.id,
        name: i.menu_item.name,
        quantity: i.quantity,
        price: i.menu_item.price,
        notes: i.notes,
      }));
      await savedListsService.saveList({
        client_phone: profile?.phone ?? '',
        client_user_id: (profile as any)?.id ?? null,
        restaurant_id: restaurantId,
        source_order_id: null,
        name: `Lista en ${restaurantName}`,
        items: listItems,
        is_favorite: true,
        last_used_at: new Date().toISOString(),
      });
      Alert.alert('Lista Guardada', 'Tu lista de compra fue guardada exitosamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la lista de compra.');
    } finally {
      setSavingList(false);
    }
  }, [cart.items, restaurantId, restaurantName, profile]);

  const classified = useMemo(() => {
    if (!selectedItem) return { sizes: [], extras: [] };
    return classifyOptions(itemOptions, selectedItem.price);
  }, [itemOptions, selectedItem]);

  const openItemDetail = useCallback(async (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes('');
    setSelectedSize(null);
    setSelectedExtras([]);
    setLoadingOptions(true);
    try {
      const opts = await restaurantService.getMenuItemOptions(item.id);
      setItemOptions(opts);
      const cls = classifyOptions(opts, item.price);
      if (cls.sizes.length > 0) {
        setSelectedSize(cls.sizes[0]);
      }
    } catch {
      setItemOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const toggleExtra = (opt: MenuItemOption) => {
    setSelectedExtras((prev) =>
      prev.find((o) => o.id === opt.id)
        ? prev.filter((o) => o.id !== opt.id)
        : [...prev, opt],
    );
  };

  const unitPrice = useMemo(() => {
    const base = selectedSize ? selectedSize.price : (selectedItem?.price ?? 0);
    const extrasTotal = selectedExtras.reduce((s, o) => s + o.price, 0);
    return base + extrasTotal;
  }, [selectedItem, selectedSize, selectedExtras]);

  const itemTotal = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!selectedItem) return;

    // If sizes exist and none selected, prompt user
    if (classified.sizes.length > 0 && !selectedSize) {
      Alert.alert('Selecciona un tamaño', 'Elige una opción de tamaño para continuar.');
      return;
    }

    const menuItemForCart: MenuItem = selectedSize
      ? { ...selectedItem, price: selectedSize.price, name: `${selectedItem.name} (${selectedSize.label})` }
      : selectedItem;

    const extrasForCart = selectedExtras;

    if (cart.restaurant_id && cart.restaurant_id !== restaurantId && cart.items.length > 0) {
      Alert.alert(
        '¿Nuevo pedido?',
        `Ya tienes productos de ${cart.restaurant_name}. Cada pedido solo puede ser de un establecimiento a la vez.\n\n¿Quieres vaciar tu carrito y empezar con ${restaurantName}?`,
        [
          { text: 'Mantener carrito', style: 'cancel' },
          {
            text: 'Nuevo pedido',
            style: 'destructive',
            onPress: () => {
              addItem(restaurantId, restaurantName, menuItemForCart, quantity, notes, extrasForCart);
              setSelectedItem(null);
            },
          },
        ],
      );
      return;
    }
    addItem(restaurantId, restaurantName, menuItemForCart, quantity, notes, extrasForCart);
    setSelectedItem(null);
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const qtyInCart = getItemQtyInCart(item.id);

    return (
      <View style={styles.menuItemCardContainer}>
        <TouchableOpacity
          style={styles.menuItemMainTouchable}
          onPress={() => openItemDetail(item)}
          activeOpacity={0.7}
        >
          {item.photo_url_1 ? (
            <Image source={{ uri: item.photo_url_1 }} style={styles.menuItemImage} />
          ) : (
            <View style={[styles.menuItemImage, styles.menuItemPlaceholder]}>
              <Ionicons
                name={isRestaurant ? 'fast-food-outline' : 'basket-outline'}
                size={24}
                color={colors['ink-hint']}
              />
            </View>
          )}

          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemName}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.menuItemPrice}>
              ${(item.sell_by_weight && item.price_per_unit ? item.price_per_unit : item.price).toFixed(2)}
              {item.sell_by_weight ? (
                <Text style={{ fontSize: 11, color: colors['ink-secondary'] }}>/{item.unit_type}</Text>
              ) : null}
            </Text>
            {item.is_promo && item.promo_description ? (
              <View style={styles.promoBadge}>
                <Text style={styles.promoText}>{item.promo_description}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Action Controls: Vertical Stepper (+ / -) for Retail/Frutería, or Quick Add */}
        <View style={styles.menuItemActionSide}>
          {!isRestaurant ? (
            qtyInCart > 0 ? (
              <View style={styles.stepperVertical}>
                <TouchableOpacity
                  style={styles.stepperBtnPlus}
                  onPress={() => handleQuickIncrement(item, qtyInCart)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.stepperQtyText}>{qtyInCart}</Text>
                <TouchableOpacity
                  style={styles.stepperBtnMinus}
                  onPress={() => handleQuickDecrement(item, qtyInCart)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="remove" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.quickAddPill}
                onPress={() => handleQuickAdd(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.quickAddPillText}>Agregar</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={styles.openDetailCircle}
              onPress={() => openItemDetail(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.agave} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const groupedData = useMemo(() => {
    const result: { category: string; items: MenuItem[] }[] = [];
    const displayCategories = selectedCategory ? [selectedCategory] : categories;
    displayCategories.forEach((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length > 0) {
        result.push({ category: cat, items: catItems });
      }
    });
    return result;
  }, [items, categories, selectedCategory]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Cover image */}
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, { backgroundColor: colors.agave }]} />
          )}
          <View style={styles.coverGradient} />
        </View>

        {/* Store Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>

        {/* Multi-Category Picking & Substitution Preferences Bar */}
        {!isRestaurant && (
          <View style={styles.multiCategoryContainer}>
            {/* Store Metadata Badges */}
            <View style={styles.storeBadgesRow}>
              <View style={styles.badgeChip}>
                <Ionicons name="flash-outline" size={14} color={colors.agave} />
                <Text style={styles.badgeChipText}>Surtido de productos</Text>
              </View>

            </View>

            {/* Save List Action Bar */}
            <TouchableOpacity
              style={styles.saveListBarBtn}
              onPress={handleSaveList}
              disabled={savingList}
              activeOpacity={0.8}
            >
              {savingList ? (
                <ActivityIndicator size="small" color={colors.agave} />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={18} color={colors.agave} />
                  <Text style={styles.saveListBarText}>Guardar Lista de Compra</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.subPrefTitle}>Las preferencias de surtido se revisan al confirmar tu pedido.</Text>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg }}><FirstOrderGuideCard stage="products" /></View>
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
          <View style={styles.menuList}>
            {groupedData.map((group, gIdx) => (
              <View key={group.category}>
                <Text style={[styles.categoryHeader, gIdx === 0 && styles.firstCategoryHeader]}>
                  {group.category}
                </Text>
                {group.items.map((item) => (
                  <View key={item.id}>{renderMenuItem({ item })}</View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: itemCount > 0 ? 100 : 40 }} />
      </ScrollView>

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </TouchableOpacity>

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

      {/* ── Item Detail Modal (UberEats-style) ── */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Item image */}
                {selectedItem.photo_url_1 ? (
                  <Image source={{ uri: selectedItem.photo_url_1 }} style={styles.modalImage} />
                ) : null}

                {/* Item name & description */}
                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                {selectedItem.description ? (
                  <Text style={styles.modalItemDesc}>{selectedItem.description}</Text>
                ) : null}

                {/* Price */}
                {classified.sizes.length > 0 ? (
                  <Text style={styles.modalItemPrice}>
                    Desde ${selectedItem.price.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.modalItemPrice}>${selectedItem.price.toFixed(2)}</Text>
                )}

                {/* Combo badge */}
                {selectedItem.is_combo && selectedItem.combo_description ? (
                  <View style={styles.comboBadge}>
                    <Ionicons name="gift-outline" size={14} color={colors.agave} />
                    <Text style={styles.comboText}>{selectedItem.combo_description}</Text>
                  </View>
                ) : null}

                {/* Options loading */}
                {loadingOptions ? (
                  <ActivityIndicator color={colors.agave} style={{ marginTop: spacing.xl }} />
                ) : (
                  <>
                    {/* ── SIZE VARIANTS (Required, radio) ── */}
                    {classified.sizes.length > 0 && (
                      <View style={styles.optionsSection}>
                        <View style={styles.optionsSectionHeader}>
                          <View>
                            <Text style={styles.optionsTitle}>Tamano</Text>
                            <Text style={styles.optionsSubtitle}>Elige una opcion</Text>
                          </View>
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>Requerido</Text>
                          </View>
                        </View>
                        {classified.sizes.map((opt) => {
                          const isSelected = selectedSize?.id === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                              onPress={() => setSelectedSize(opt)}
                            >
                              <View style={styles.optionLeft}>
                                <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                                  {isSelected && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                  {opt.label}
                                </Text>
                              </View>
                              <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
                                ${opt.price.toFixed(2)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* ── EXTRAS (Optional, checkboxes) ── */}
                    {classified.extras.length > 0 && (
                      <View style={styles.optionsSection}>
                        <View style={styles.optionsSectionHeader}>
                          <View>
                            <Text style={styles.optionsTitle}>Extras</Text>
                            <Text style={styles.optionsSubtitle}>Agrega lo que quieras</Text>
                          </View>
                          <View style={styles.optionalBadge}>
                            <Text style={styles.optionalText}>Opcional</Text>
                          </View>
                        </View>
                        {classified.extras.map((opt) => {
                          const isSelected = selectedExtras.some((o) => o.id === opt.id);
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                              onPress={() => toggleExtra(opt)}
                            >
                              <View style={styles.optionLeft}>
                                <View style={[styles.checkboxOuter, isSelected && styles.checkboxOuterActive]}>
                                  {isSelected && (
                                    <Ionicons name="checkmark" size={14} color={colors.white} />
                                  )}
                                </View>
                                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                  {opt.label}
                                </Text>
                              </View>
                              {opt.price > 0 && (
                                <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
                                  +${opt.price.toFixed(2)}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {/* Notes */}
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notas especiales</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder={notesPlaceholder}
                    placeholderTextColor={colors['ink-hint']}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </View>

                <View style={styles.quantityRow}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={styles.quantityLabel}>Cantidad / Unidades</Text>
                    <Text style={{ fontFamily: fonts.outfit.regular, fontSize: 11, color: colors['ink-muted'], marginTop: 2, flexWrap: 'wrap' }}>(Ej: 1 kilo, 1 pieza según el producto)</Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={quantity <= 1 ? colors['ink-hint'] : colors.ink} />
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
                Agregar al carrito  ·  ${itemTotal.toFixed(2)}
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
  mainScroll: {
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 220,
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: 'transparent',
    // Simulated gradient with bottom fade
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
    zIndex: 10,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  restaurantName: {
    ...textStyles.h2,
    color: colors.ink,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
    paddingHorizontal: spacing.lg,
  },
  categoryHeader: {
    ...textStyles.h3,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  firstCategoryHeader: {
    marginTop: spacing.sm,
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
    maxHeight: '90%',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingBottom: spacing.md,
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
  // Options sections (UberEats-style)
  optionsSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  optionsTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  optionsSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  requiredBadge: {
    backgroundColor: colors.agave,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  requiredText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 10,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    backgroundColor: colors.cloud,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  optionalText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 10,
    color: colors['ink-muted'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  optionRowSelected: {
    backgroundColor: colors['agave-light'],
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  // Custom radio button
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors['ink-hint'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: colors.agave,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.agave,
  },
  // Custom checkbox
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors['ink-hint'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOuterActive: {
    backgroundColor: colors.agave,
    borderColor: colors.agave,
  },
  optionLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  optionLabelSelected: {
    fontFamily: fonts.outfit.semiBold,
    color: colors['agave-dark'],
  },
  optionPrice: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  optionPriceSelected: {
    color: colors.agave,
    fontFamily: fonts.outfit.semiBold,
  },
  notesSection: {
    marginTop: spacing.xl,
  },
  notesLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  notesInput: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.ink,
    minHeight: 44,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
  },
  quantityLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.ink,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: colors.ink,
    minWidth: 24,
    textAlign: 'center',
  },
  addToCartBtn: {
    backgroundColor: colors.agave,
    height: 54,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addToCartText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.white,
  },

  // ── Multi-Category & Stepper Styles ──
  menuItemCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  menuItemMainTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  menuItemActionSide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  stepperVertical: {
    alignItems: 'center',
    backgroundColor: colors.snow,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  stepperBtnPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnMinus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQtyText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: colors.ink,
    marginVertical: 4,
    textAlign: 'center',
  },
  quickAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.agave,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 2,
  },
  quickAddPillText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    color: colors.white,
  },
  openDetailCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiCategoryContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  storeBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.snow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  badgeChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.ink,
  },
  saveListBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#E8F5F2',
    paddingVertical: 10,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.agave,
  },
  saveListBarText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: colors.agave,
  },
  subPrefCard: {
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  subPrefTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: colors['ink-secondary'],
    marginBottom: spacing.xs,
  },
  subPrefChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  subPrefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  subPrefChipActive: {
    backgroundColor: colors.agave,
    borderColor: colors.agave,
  },
  subPrefChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.ink,
  },
  subPrefChipTextActive: {
    color: colors.white,
  },
});
