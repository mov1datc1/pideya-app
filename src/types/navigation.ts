/**
 * Tipos de navegacion — Pide ya
 */

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  OrdersTab: undefined;
  TrackingTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  RestaurantMenu: { restaurantId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderStatus: { orderId: string };
  Tracking: { orderId: string };
  Notifications: undefined;
  Rating: { orderId: string };
  Address: undefined;
  OrderHistory: undefined;
};
