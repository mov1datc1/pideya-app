/**
 * Tipos de navegacion — Pide ya
 */

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Terms: undefined;
  Login: undefined;
  Register: undefined;
  OtpVerify: { email: string };
  CompleteProfile: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  OrdersTab: undefined;
  TrackingTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  Main: undefined;
  RestaurantDetail: { restaurantId: string; restaurantName: string; coverUrl?: string };
  Cart: undefined;
  Checkout: undefined;
  OrderStatus: { orderId: string };
  Tracking: { orderId: string };
  Notifications: undefined;
  Rating: { orderId: string };
  Address: undefined;
  AddressPicker: {
    latitude?: number;
    longitude?: number;
    currentAddress?: string;
    onSelect?: (data: { address: string; latitude: number; longitude: number }) => void;
  };
  OrderHistory: undefined;
};
