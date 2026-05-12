import React, { useState, useEffect, useCallback, useContext, createContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Cart,
  CartItem,
  MenuItem,
  MenuItemOption,
  PaymentMethod,
  DeliveryType,
} from '../types/database';

const STORAGE_KEY = '@pideya/cart';

const emptyCart: Cart = {
  restaurant_id: '',
  restaurant_name: '',
  items: [],
  payment_method: 'cash',
  delivery_type: 'delivery',
  delivery_address_text: '',
  delivery_lat: 0,
  delivery_lng: 0,
  delivery_location_note: '',
  tip_amount: 0,
  pays_with: null,
};

interface CartContextValue {
  cart: Cart;
  loaded: boolean;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    menuItem: MenuItem,
    quantity: number,
    notes: string,
    selectedOptions: MenuItemOption[],
  ) => void;
  removeItem: (menuItemId: string, menuItemName?: string) => void;
  updateQuantity: (menuItemId: string, quantity: number, menuItemName?: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDeliveryType: (type: DeliveryType) => void;
  setDeliveryAddress: (text: string, lat: number, lng: number, note: string) => void;
  setTip: (amount: number) => void;
  setPaysWith: (amount: number | null) => void;
  clearCart: () => void;
  itemsTotal: number;
  itemCount: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loaded, setLoaded] = useState(false);

  // Cargar carrito de AsyncStorage al iniciar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setCart(JSON.parse(raw));
      })
      .finally(() => setLoaded(true));
  }, []);

  // Persistir carrito en cada cambio
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, loaded]);

  const addItem = useCallback(
    (
      restaurantId: string,
      restaurantName: string,
      menuItem: MenuItem,
      quantity: number,
      notes: string,
      selectedOptions: MenuItemOption[],
    ) => {
      setCart((prev) => {
        // Si el carrito es de otro restaurante, vaciarlo
        if (prev.restaurant_id && prev.restaurant_id !== restaurantId) {
          return {
            ...emptyCart,
            restaurant_id: restaurantId,
            restaurant_name: restaurantName,
            items: [{ menu_item: menuItem, quantity, notes, selected_options: selectedOptions }],
          };
        }

        const existingIdx = prev.items.findIndex(
          (i) => i.menu_item.id === menuItem.id && i.menu_item.name === menuItem.name,
        );

        const newItems = [...prev.items];
        if (existingIdx >= 0) {
          newItems[existingIdx] = {
            ...newItems[existingIdx],
            quantity: newItems[existingIdx].quantity + quantity,
            notes,
            selected_options: selectedOptions,
          };
        } else {
          newItems.push({ menu_item: menuItem, quantity, notes, selected_options: selectedOptions });
        }

        return {
          ...prev,
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          items: newItems,
        };
      });
    },
    [],
  );

  const removeItem = useCallback((menuItemId: string, menuItemName?: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) =>
        menuItemName
          ? !(i.menu_item.id === menuItemId && i.menu_item.name === menuItemName)
          : i.menu_item.id !== menuItemId,
      ),
    }));
  }, []);

  const updateQuantity = useCallback(
    (menuItemId: string, quantity: number, menuItemName?: string) => {
      if (quantity <= 0) {
        removeItem(menuItemId, menuItemName);
        return;
      }
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          menuItemName
            ? (i.menu_item.id === menuItemId && i.menu_item.name === menuItemName ? { ...i, quantity } : i)
            : (i.menu_item.id === menuItemId ? { ...i, quantity } : i),
        ),
      }));
    },
    [removeItem],
  );

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setCart((prev) => ({ ...prev, payment_method: method }));
  }, []);

  const setDeliveryType = useCallback((type: DeliveryType) => {
    setCart((prev) => ({ ...prev, delivery_type: type }));
  }, []);

  const setDeliveryAddress = useCallback(
    (text: string, lat: number, lng: number, note: string) => {
      setCart((prev) => ({
        ...prev,
        delivery_address_text: text,
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_location_note: note,
      }));
    },
    [],
  );

  const setTip = useCallback((amount: number) => {
    setCart((prev) => ({ ...prev, tip_amount: amount }));
  }, []);

  const setPaysWith = useCallback((amount: number | null) => {
    setCart((prev) => ({ ...prev, pays_with: amount }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(emptyCart);
  }, []);

  // Calculos
  const itemsTotal = cart.items.reduce((sum, item) => {
    const optionsPrice = item.selected_options.reduce((s, o) => s + o.price, 0);
    return sum + (item.menu_item.price + optionsPrice) * item.quantity;
  }, 0);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(
    () => ({
      cart,
      loaded,
      addItem,
      removeItem,
      updateQuantity,
      setPaymentMethod,
      setDeliveryType,
      setDeliveryAddress,
      setTip,
      setPaysWith,
      clearCart,
      itemsTotal,
      itemCount,
      isEmpty: cart.items.length === 0,
    }),
    [cart, loaded, addItem, removeItem, updateQuantity, setPaymentMethod, setDeliveryType, setDeliveryAddress, setTip, setPaysWith, clearCart, itemsTotal, itemCount],
  );

  return React.createElement(CartContext.Provider, { value }, children);
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};
