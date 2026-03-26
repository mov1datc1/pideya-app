import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { createOrder } from '../../services/orders';
import * as addressService from '../../services/addresses';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { PaymentMethod, OrderItemJSON, UserAddress } from '../../types/database';

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
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load saved addresses
  useEffect(() => {
    addressService.getAddresses().then((addrs) => {
      setSavedAddresses(addrs);
      // Auto-select default or first address
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
    setShowNewAddress(false);
  };

  const handleSaveAddress = async () => {
    if (!addressText.trim()) return;
    const newAddr = await addressService.addAddress({
      user_id: profile?.full_name || 'local',
      label: addressLabel.trim() || 'Mi direccion',
      address_text: addressText.trim(),
      reference: locationNote.trim() || null,
      latitude: 0,
      longitude: 0,
      is_default: savedAddresses.length === 0,
      is_pin_location: false,
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

  const deliveryFee = 25;
  const total = itemsTotal + deliveryFee + cart.tip_amount;

  const handlePlaceOrder = async () => {
    if (!addressText.trim()) {
      Alert.alert('Direccion requerida', 'Por favor ingresa tu direccion de entrega.');
      return;
    }

    setDeliveryAddress(addressText, cart.delivery_lat, cart.delivery_lng, locationNote);

    setSubmitting(true);
    try {
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
        client_lat: cart.delivery_lat || 0,
        client_lng: cart.delivery_lng || 0,
        client_location_note: locationNote || undefined,
        items: orderItems,
        subtotal: itemsTotal,
        delivery_amount: deliveryFee,
        total,
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
        <Text style={styles.headerTitle}>Confirmar pedido</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Delivery address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Direccion de entrega</Text>
          </View>

          {/* Saved addresses */}
          {savedAddresses.length > 0 && (
            <View style={styles.savedAddresses}>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.savedAddr,
                    selectedAddressId === addr.id && !showNewAddress && styles.savedAddrActive,
                  ]}
                  onPress={() => selectAddress(addr)}
                >
                  <View style={styles.savedAddrIcon}>
                    <Ionicons
                      name={addr.label.toLowerCase().includes('casa') ? 'home-outline' :
                            addr.label.toLowerCase().includes('trabajo') ? 'briefcase-outline' : 'location-outline'}
                      size={18}
                      color={selectedAddressId === addr.id && !showNewAddress ? colors.agave : colors['ink-muted']}
                    />
                  </View>
                  <View style={styles.savedAddrInfo}>
                    <Text style={[
                      styles.savedAddrLabel,
                      selectedAddressId === addr.id && !showNewAddress && styles.savedAddrLabelActive,
                    ]}>
                      {addr.label}
                    </Text>
                    <Text style={styles.savedAddrText} numberOfLines={1}>{addr.address_text}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteAddress(addr.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors['ink-hint']} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* New address toggle */}
          <TouchableOpacity
            style={[styles.newAddrBtn, showNewAddress && styles.newAddrBtnActive]}
            onPress={() => {
              setShowNewAddress(true);
              setSelectedAddressId(null);
              setAddressText('');
              setLocationNote('');
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={showNewAddress ? colors.agave : colors['ink-muted']} />
            <Text style={[styles.newAddrBtnText, showNewAddress && styles.newAddrBtnTextActive]}>
              Nueva direccion
            </Text>
          </TouchableOpacity>

          {/* Address inputs */}
          {showNewAddress && (
            <View style={styles.addressInputs}>
              <TextInput
                style={styles.addressInput}
                placeholder="Ej: Calle Hidalgo #123, Centro"
                placeholderTextColor={colors['ink-hint']}
                value={addressText}
                onChangeText={setAddressText}
                multiline
              />
              <TextInput
                style={styles.noteInput}
                placeholder="Referencia: entre calles, color de casa..."
                placeholderTextColor={colors['ink-hint']}
                value={locationNote}
                onChangeText={setLocationNote}
              />
              {addressText.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.saveAddrBtn}
                  onPress={() => setShowSaveModal(true)}
                >
                  <Ionicons name="bookmark-outline" size={16} color={colors.agave} />
                  <Text style={styles.saveAddrBtnText}>Guardar esta direccion</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Metodo de pago</Text>
          </View>
          <View style={styles.paymentOptions}>
            {PAYMENT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.paymentOption,
                  cart.payment_method === opt.value && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod(opt.value)}
              >
                <Ionicons
                  name={opt.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={cart.payment_method === opt.value ? colors.agave : colors['ink-muted']}
                />
                <Text
                  style={[
                    styles.paymentLabel,
                    cart.payment_method === opt.value && styles.paymentLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
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
            </View>
          )}
        </View>

        {/* Tip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Propina para el repartidor</Text>
          </View>
          <View style={styles.tipOptions}>
            {TIP_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipOption,
                  cart.tip_amount === amount && styles.tipOptionActive,
                ]}
                onPress={() => setTip(amount)}
              >
                <Text
                  style={[
                    styles.tipText,
                    cart.tip_amount === amount && styles.tipTextActive,
                  ]}
                >
                  {amount === 0 ? 'Sin propina' : `$${amount}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color={colors.agave} />
            <Text style={styles.sectionTitle}>Resumen</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({itemCount} productos)</Text>
            <Text style={styles.summaryValue}>${itemsTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envio</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          {cart.tip_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Propina</Text>
              <Text style={styles.summaryValue}>${cart.tip_amount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Place order button */}
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
            <>
              <Text style={styles.orderBtnText}>Pedir ahora</Text>
              <Text style={styles.orderBtnPrice}>${total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Save address modal */}
      <Modal visible={showSaveModal} animationType="fade" transparent>
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModalContent}>
            <Text style={styles.saveModalTitle}>Guardar direccion</Text>
            <Text style={styles.saveModalSubtitle}>Dale un nombre para encontrarla facil</Text>
            <TextInput
              style={styles.saveModalInput}
              placeholder="Ej: Casa, Trabajo, Mama..."
              placeholderTextColor={colors['ink-hint']}
              value={addressLabel}
              onChangeText={setAddressLabel}
              autoFocus
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
  // Saved addresses
  savedAddresses: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  newAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  newAddrBtnActive: {},
  newAddrBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-muted'],
  },
  newAddrBtnTextActive: {
    color: colors.agave,
  },
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
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  saveAddrBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.agave,
  },
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
  tipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tipOption: {
    paddingHorizontal: spacing.lg,
    height: 36,
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
  },
  totalLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.ink,
  },
  totalValue: {
    fontFamily: fonts.playfair.bold,
    fontSize: 22,
    color: colors.agave,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
  },
  orderBtn: {
    backgroundColor: colors.agave,
    height: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  orderBtnDisabled: {
    opacity: 0.7,
  },
  orderBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.white,
  },
  orderBtnPrice: {
    fontFamily: fonts.playfair.bold,
    fontSize: 17,
    color: colors.white,
  },
  // Save address modal
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
    marginBottom: spacing.lg,
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
