import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { createOrder } from '../../services/orders';
import * as clientProfileService from '../../services/clientProfile';
import * as addressService from '../../services/addresses';
import { fetchCommissionTiers, calculateCommission } from '../../services/commission';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { PaymentMethod, OrderItemJSON, UserAddress, CommissionTier, DeliveryType } from '../../types/database';

type NavType = NativeStackNavigationProp<RootStackParamList>;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { value: 'card', label: 'Tarjeta', icon: 'card-outline' },
  { value: 'oxxo', label: 'OXXO', icon: 'storefront-outline' },
];

const TIP_OPTIONS = [0, 10, 20, 30, 50];




export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const {
    cart,
    itemsTotal,
    itemCount,
    setPaymentMethod,
    setDeliveryType,
    setDeliveryAddress,
    setTip,
    setPaysWith,
    clearCart,
  } = useCart();

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(cart.delivery_address_text);
  const [locationNote, setLocationNote] = useState(cart.delivery_location_note);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressLat, setAddressLat] = useState(cart.delivery_lat || 0);
  const [addressLng, setAddressLng] = useState(cart.delivery_lng || 0);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load saved addresses
  useEffect(() => {
    addressService.getAddresses().then((addrs) => {
      setSavedAddresses(addrs);
      const def = addrs.find((a) => a.is_default) || addrs[0];
      if (def && !addressText) {
        setSelectedAddressId(def.id);
        setAddressText(def.address_text);
        setLocationNote(def.reference || '');
      } else if (!addrs.length) {
        setShowNewAddress(true);
      }
    });
  }, []);

  const selectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddressText(addr.address_text);
    setLocationNote(addr.reference || '');
    setAddressLat(addr.latitude);
    setAddressLng(addr.longitude);
    setShowNewAddress(false);
  };

  const openMapPicker = () => {
    navigation.navigate('AddressPicker', {
      latitude: addressLat,
      longitude: addressLng,
      currentAddress: addressText,
      onSelect: (data: { address: string; latitude: number; longitude: number }) => {
        setAddressText(data.address);
        setAddressLat(data.latitude);
        setAddressLng(data.longitude);
      },
    });
  };

  const handleSaveAddress = async () => {
    if (!addressText.trim()) return;
    const newAddr = await addressService.addAddress({
      user_id: profile?.full_name || 'local',
      label: addressLabel.trim() || 'Mi direccion',
      address_text: addressText.trim(),
      reference: locationNote.trim() || null,
      latitude: addressLat,
      longitude: addressLng,
      is_default: savedAddresses.length === 0,
      is_pin_location: addressLat !== 0,
    });
    setSavedAddresses((prev) => [...prev, newAddr]);
    setSelectedAddressId(newAddr.id);
    setShowSaveModal(false);
    setAddressLabel('');
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Eliminar direccion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await addressService.deleteAddress(id);
          setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
          if (selectedAddressId === id) {
            setSelectedAddressId(null);
            setAddressText('');
            setLocationNote('');
            setShowNewAddress(true);
          }
        },
      },
    ]);
  };

  // Commission tiers from app_settings
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);

  useEffect(() => {
    fetchCommissionTiers().then(setCommissionTiers);
  }, []);

  // Price calculations
  const isPickup = cart.delivery_type === 'pickup';
  const deliveryFee = isPickup ? 0 : 25;
  const commissionFee = useMemo(() => calculateCommission(itemsTotal, commissionTiers), [itemsTotal, commissionTiers]);
  const total = itemsTotal + deliveryFee + commissionFee + cart.tip_amount;

  const selectedAddress = useMemo(
    () => savedAddresses.find((a) => a.id === selectedAddressId),
    [savedAddresses, selectedAddressId],
  );

  const getAddressIcon = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes('casa') || l.includes('home')) return 'home';
    if (l.includes('trabajo') || l.includes('oficina') || l.includes('work')) return 'briefcase';
    return 'location';
  };

  const handlePlaceOrder = async () => {
    if (!isPickup && !addressText.trim()) {
      Alert.alert('Direccion requerida', 'Por favor ingresa tu direccion de entrega.');
      return;
    }

    setDeliveryAddress(addressText, addressLat, addressLng, locationNote);

    setSubmitting(true);
    try {
      // Check if user is blocked
      const phone = profile?.phone || '';
      if (phone) {
        const blockStatus = await clientProfileService.checkUserBlocked(phone);
        if (blockStatus.isBlocked) {
          Alert.alert(
            'Cuenta suspendida',
            'Tu cuenta ha sido suspendida por cancelaciones excesivas. Contacta a soporte para reactivarla.',
          );
          setSubmitting(false);
          return;
        }
      }
      const orderItems: OrderItemJSON[] = cart.items.map((item) => ({
        id: item.menu_item.id,
        name: item.menu_item.name,
        price: item.menu_item.price,
        quantity: item.quantity,
        notes: item.notes || undefined,
        options: item.selected_options.length > 0
          ? item.selected_options.map((o) => ({ label: o.label, price: o.price }))
          : undefined,
      }));

      const order = await createOrder({
        restaurant_id: cart.restaurant_id,
        client_name: profile?.full_name || 'Cliente',
        client_phone: profile?.phone || '',
        client_lat: isPickup ? 0 : (addressLat || 0),
        client_lng: isPickup ? 0 : (addressLng || 0),
        client_location_note: isPickup ? 'PICKUP — Recoger en local' : (locationNote || undefined),
        items: orderItems,
        subtotal: itemsTotal,
        commission_amount: commissionFee,
        delivery_amount: deliveryFee,
        delivery_type: cart.delivery_type,
        total,
        payment_method: cart.payment_method,
      });

      clearCart();
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Main' },
          { name: 'OrderStatus', params: { orderId: order.id } },
        ],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear pedido';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terminar y pagar</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── PICKUP / DELIVERY SELECTOR ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Tipo de entrega</Text>
          </View>
          <View style={styles.deliveryTypeRow}>
            <TouchableOpacity
              style={[styles.deliveryTypeCard, cart.delivery_type === 'delivery' && styles.deliveryTypeCardActive]}
              onPress={() => setDeliveryType('delivery')}
              activeOpacity={0.8}
            >
              <Text style={styles.deliveryTypeEmoji}>{'\ud83d\udef5'}</Text>
              <Text style={[styles.deliveryTypeLabel, cart.delivery_type === 'delivery' && styles.deliveryTypeLabelActive]}>Envío a domicilio</Text>
              <Text style={styles.deliveryTypeHint}>Un repartidor lo lleva</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deliveryTypeCard, cart.delivery_type === 'pickup' && styles.deliveryTypeCardActive]}
              onPress={() => setDeliveryType('pickup')}
              activeOpacity={0.8}
            >
              <Text style={styles.deliveryTypeEmoji}>{'\ud83c\udfe0'}</Text>
              <Text style={[styles.deliveryTypeLabel, cart.delivery_type === 'pickup' && styles.deliveryTypeLabelActive]}>Recoger en local</Text>
              <Text style={styles.deliveryTypeHint}>Sin costo de envío</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DELIVERY ADDRESS (read-only, from Home) ── */}
        {!isPickup && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={colors.agave} />
              <Text style={styles.sectionTitle}>Dirección de entrega</Text>
            </View>
            {selectedAddress ? (
              <View style={styles.addressCard}>
                <View style={styles.addressIconCircle}>
                  <Ionicons
                    name={getAddressIcon(selectedAddress.label) as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={colors.agave}
                  />
                </View>
                <View style={styles.addressCardInfo}>
                  <Text style={styles.addressCardLabel}>{selectedAddress.label}</Text>
                  <Text style={styles.addressCardText} numberOfLines={2}>
                    {selectedAddress.address_text}
                  </Text>
                </View>
              </View>
            ) : addressText ? (
              <View style={styles.addressCard}>
                <View style={styles.addressIconCircle}>
                  <Ionicons name="location" size={20} color={colors.agave} />
                </View>
                <View style={styles.addressCardInfo}>
                  <Text style={styles.addressCardLabel}>Mi ubicación</Text>
                  <Text style={styles.addressCardText} numberOfLines={2}>{addressText}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.outfit.regular, fontSize: 14, color: colors['ink-muted'], padding: spacing.sm }}>
                Selecciona una dirección desde la pantalla principal.
              </Text>
            )}
            {locationNote ? (
              <View style={styles.instructionsRow}>
                <Ionicons name="person-outline" size={20} color={colors['ink-muted']} />
                <View style={styles.instructionsInfo}>
                  <Text style={styles.instructionsTitle}>Referencia</Text>
                  <Text style={styles.instructionsText} numberOfLines={1}>{locationNote}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ── PICKUP INFO ── */}
        {isPickup && (
          <View style={[styles.section, { backgroundColor: 'rgba(45,139,122,0.06)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 28 }}>{'\ud83c\udfe0'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.outfit.semiBold, fontSize: 16, color: colors.ink }}>Recoger en el local</Text>
                <Text style={{ fontFamily: fonts.outfit.regular, fontSize: 13, color: colors['ink-muted'], marginTop: 2 }}>
                  {cart.restaurant_name} · Te avisaremos cuando esté listo
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── ORDER SUMMARY (collapsible) ── */}
        <TouchableOpacity
          style={styles.orderSummaryCard}
          onPress={() => setShowOrderItems((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.orderSummaryLeft}>
            <Ionicons name="restaurant" size={20} color={colors.agave} />
            <View>
              <Text style={styles.orderSummaryName}>{cart.restaurant_name}</Text>
              <Text style={styles.orderSummaryCount}>
                {itemCount} {itemCount === 1 ? 'articulo' : 'articulos'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={showOrderItems ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors['ink-muted']}
          />
        </TouchableOpacity>

        {/* Expanded item list */}
        {showOrderItems && (
          <View style={styles.orderItemsList}>
            {cart.items.map((item, idx) => {
              const optionsPrice = item.selected_options.reduce((s, o) => s + o.price, 0);
              const lineTotal = (item.menu_item.price + optionsPrice) * item.quantity;
              return (
                <View key={idx} style={styles.orderItemRow}>
                  <View style={styles.orderItemQty}>
                    <Text style={styles.orderItemQtyText}>{item.quantity}x</Text>
                  </View>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>{item.menu_item.name}</Text>
                    {item.selected_options.length > 0 && (
                      <Text style={styles.orderItemOptions}>
                        {item.selected_options.map((o) => o.label).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.orderItemPrice}>${lineTotal.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── PAYMENT METHOD ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Pago</Text>
          </View>
          <View style={styles.paymentOptions}>
            {PAYMENT_OPTIONS.map((opt) => {
              const isActive = cart.payment_method === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.paymentOption, isActive && styles.paymentOptionActive]}
                  onPress={() => setPaymentMethod(opt.value)}
                >
                  <Ionicons
                    name={opt.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={isActive ? colors.agave : colors['ink-muted']}
                  />
                  <Text style={[styles.paymentLabel, isActive && styles.paymentLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cart.payment_method === 'cash' && (
            <View style={styles.paysWithRow}>
              <Text style={styles.paysWithLabel}>Pagas con:</Text>
              <TextInput
                style={styles.paysWithInput}
                placeholder="$"
                placeholderTextColor={colors['ink-hint']}
                keyboardType="numeric"
                value={cart.pays_with ? String(cart.pays_with) : ''}
                onChangeText={(v) => setPaysWith(v ? Number(v) : null)}
              />
              {cart.pays_with && cart.pays_with > total && (
                <Text style={styles.changeText}>
                  Cambio: ${(cart.pays_with - total).toFixed(2)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── TIP (delivery only) ── */}
        {!isPickup && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Propina para el repartidor</Text>
          </View>
          <View style={styles.tipOptions}>
            {TIP_OPTIONS.map((amount) => {
              const isActive = cart.tip_amount === amount;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[styles.tipOption, isActive && styles.tipOptionActive]}
                  onPress={() => setTip(amount)}
                >
                  <Text style={[styles.tipText, isActive && styles.tipTextActive]}>
                    {amount === 0 ? 'Sin propina' : `$${amount}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        )}

        {/* ── PRICE BREAKDOWN ── */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>${itemsTotal.toFixed(2)}</Text>
          </View>
          {!isPickup && (
          <View style={styles.priceRow}>
            <View style={styles.priceLabelRow}>
              <Text style={styles.priceLabel}>Costo de envío</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => Alert.alert(
                  'Costo de envío',
                  'El costo de envío se calcula según la distancia entre el restaurante y tu dirección.',
                )}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors['ink-hint']} />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          )}
          <View style={styles.priceRow}>
            <View style={styles.priceLabelRow}>
              <Text style={styles.priceLabel}>Comisión PideYa</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => Alert.alert(
                  'Comisión PideYa',
                  'Esta comisión ayuda a mantener la plataforma y mejorar el servicio para ti.',
                )}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors['ink-hint']} />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceValue}>${commissionFee.toFixed(2)}</Text>
          </View>
          {cart.tip_amount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Propina</Text>
              <Text style={styles.priceValue}>${cart.tip_amount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── PLACE ORDER BUTTON ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.orderBtn, submitting && styles.orderBtnDisabled]}
          onPress={handlePlaceOrder}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.orderBtnText}>
              Hacer el pedido  ·  ${total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── SAVE ADDRESS MODAL ── */}
      <Modal visible={showSaveModal} animationType="fade" transparent>
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModalContent}>
            <Text style={styles.saveModalTitle}>Guardar direccion</Text>
            <Text style={styles.saveModalSubtitle}>Dale un nombre para encontrarla facil</Text>

            {/* Quick label chips */}
            <View style={styles.labelChips}>
              {['Casa', 'Trabajo', 'Familia'].map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelChip, addressLabel === l && styles.labelChipActive]}
                  onPress={() => setAddressLabel(l)}
                >
                  <Ionicons
                    name={l === 'Casa' ? 'home-outline' : l === 'Trabajo' ? 'briefcase-outline' : 'people-outline'}
                    size={14}
                    color={addressLabel === l ? colors.agave : colors['ink-muted']}
                  />
                  <Text style={[styles.labelChipText, addressLabel === l && styles.labelChipTextActive]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.saveModalInput}
              placeholder="O escribe un nombre..."
              placeholderTextColor={colors['ink-hint']}
              value={addressLabel}
              onChangeText={setAddressLabel}
            />
            <View style={styles.saveModalActions}>
              <TouchableOpacity
                style={styles.saveModalCancel}
                onPress={() => { setShowSaveModal(false); setAddressLabel(''); }}
              >
                <Text style={styles.saveModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalSave} onPress={handleSaveAddress}>
                <Text style={styles.saveModalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  // ── Delivery type selector ──
  deliveryTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deliveryTypeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.cloud,
    backgroundColor: colors.snow,
    gap: spacing.xs,
  },
  deliveryTypeCardActive: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  deliveryTypeEmoji: {
    fontSize: 28,
  },
  deliveryTypeLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  deliveryTypeLabelActive: {
    color: colors['agave-dark'],
  },
  deliveryTypeHint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: colors['ink-muted'],
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  // ── Address card (compact view) ──
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  addressIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCardInfo: {
    flex: 1,
  },
  addressCardLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.ink,
  },
  addressCardText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  // Delivery instructions row
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
  },
  instructionsInfo: {
    flex: 1,
  },
  instructionsTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.ink,
  },
  instructionsText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  // ── Map picker ──
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors['agave-light'],
    borderWidth: 1.5,
    borderColor: colors.agave,
    borderStyle: 'dashed',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  mapPickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPickerInfo: {
    flex: 1,
  },
  mapPickerTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors['agave-dark'],
  },
  mapPickerHint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.agave,
    marginTop: 1,
  },
  mapMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: 52, // align with address text
  },
  mapMiniBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.agave,
  },
  // ── Saved addresses ──
  savedAddresses: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  savedAddr: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    gap: spacing.sm,
  },
  savedAddrActive: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  savedAddrIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.snow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedAddrInfo: {
    flex: 1,
  },
  savedAddrLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.ink,
  },
  savedAddrLabelActive: {
    color: colors['agave-dark'],
  },
  savedAddrText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  // ── Address inputs ──
  addressInputs: {
    marginTop: spacing.xs,
  },
  addressInput: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    minHeight: 48,
  },
  noteInput: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.sm,
    height: 44,
  },
  saveAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  saveAddrBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.agave,
  },
  // ── Order summary (collapsible) ──
  orderSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  orderSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orderSummaryName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  orderSummaryCount: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
  },
  orderItemsList: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  orderItemQty: {
    width: 28,
  },
  orderItemQtyText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.agave,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.ink,
  },
  orderItemOptions: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  orderItemPrice: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
    marginLeft: spacing.sm,
  },
  // ── Payment ──
  paymentOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    gap: spacing.xs,
  },
  paymentOptionActive: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  paymentLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  paymentLabelActive: {
    color: colors.agave,
  },
  paysWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  paysWithLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  paysWithInput: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    width: 100,
    fontFamily: fonts.outfit.medium,
    fontSize: 16,
    color: colors.ink,
  },
  changeText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.agave,
  },
  // ── Tip ──
  tipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tipOption: {
    paddingHorizontal: spacing.lg,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cloud,
  },
  tipOptionActive: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  tipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-muted'],
  },
  tipTextActive: {
    color: colors.agave,
    fontFamily: fonts.outfit.semiBold,
  },
  // ── Price breakdown ──
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors['ink-secondary'],
  },
  priceValue: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors['ink-secondary'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fonts.playfair.bold,
    fontSize: 22,
    color: colors.agave,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  orderBtn: {
    backgroundColor: colors.ink,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBtnDisabled: {
    opacity: 0.7,
  },
  orderBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.white,
  },
  // ── Save address modal ──
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  saveModalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
  },
  saveModalTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  saveModalSubtitle: {
    ...textStyles.caption,
    color: colors['ink-muted'],
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  labelChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cloud,
  },
  labelChipActive: {
    borderColor: colors.agave,
    backgroundColor: colors['agave-light'],
  },
  labelChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-muted'],
  },
  labelChipTextActive: {
    color: colors.agave,
  },
  saveModalInput: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    height: 48,
  },
  saveModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  saveModalCancel: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalCancelText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  saveModalSave: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalSaveText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.white,
  },
});
