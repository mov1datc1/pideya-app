import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken } from './auth';

// Config para notificaciones en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra el dispositivo para push notifications.
 * Retorna el expo push token.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.warn('Push notifications solo funcionan en dispositivos físicos');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permisos de notificación no concedidos');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deliveries', {
      name: 'Entregas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2D8B7A',
      sound: 'default',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
};

/**
 * Registra push token y lo guarda en el perfil del driver.
 */
export const setupPushNotifications = async (
  driverId: string,
): Promise<void> => {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(driverId, token);
  }
};

/**
 * Envía una notificación local (para testing o feedback).
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
};
