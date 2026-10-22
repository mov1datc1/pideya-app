import { shouldDisplayEvent } from './notificationDevice';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configurar como se muestran las notificaciones cuando la app esta abierta
Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const show = await shouldDisplayEvent(notification.request.content.data || {});
    return { shouldShowAlert: show, shouldPlaySound: show, shouldSetBadge: false, shouldShowBanner: show, shouldShowList: show };
  },
});

/**
 * Registrar el dispositivo para push notifications.
 * Retorna el Expo push token.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.warn('Push notifications solo funcionan en dispositivos fisicos');
    return null;
  }

  // Android necesita canal de notificaciones
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pide ya',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permisos de notificaciones denegados');
    return null;
  }

  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  return token;
};

/**
 * Guardar el push token en la tabla push_tokens de Supabase.
 * Usa upsert para actualizar si el token ya existe.
 */
export const savePushToken = async (
  clientPhone: string,
  pushToken: string,
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[PideYa] savePushToken: no auth user, skipping');
      return;
    }


    // Save to push_tokens table (used by pg_net trigger for real push)
    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          expo_token: pushToken,
          client_phone: clientPhone,
          device_info: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expo_token' },
      );

    if (upsertError) {
      console.error('[PideYa] savePushToken upsert error:', JSON.stringify(upsertError));
    } else {
      console.log('[PideYa] savePushToken: token saved successfully');
    }

    // Also keep in user_metadata for backwards compatibility
    await supabase.auth.updateUser({
      data: { push_token: pushToken, phone: clientPhone },
    });
  } catch (err) {
    console.error('[PideYa] savePushToken exception:', err);
  }
};

/** Listener para notificaciones recibidas (app en foreground) */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void,
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/** Listener para cuando el usuario toca una notificacion */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void,
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/** Enviar notificacion local (para pruebas o alertas internas) */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>,
) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null, // inmediata
  });
};
