import * as Location from 'expo-location';
import { updateDriverLocation } from './delivery';

export const LOCATION_TASK_NAME = 'pideya-driver-bg-location';

// Estado compartido para el orderId activo
let activeOrderId: string | null = null;

export const setActiveOrderId = (orderId: string | null) => {
  activeOrderId = orderId;
};

/**
 * Define la tarea de background para tracking GPS.
 * Envuelto en try/catch para Expo Go donde TaskManager puede no estar disponible.
 */
try {
  const TaskManager = require('expo-task-manager');
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.error('Background location error:', error.message);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];

    await updateDriverLocation({
      orderId: activeOrderId,
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      accuracy_m: latest.coords.accuracy,
      heading: latest.coords.heading,
      speed_mps: latest.coords.speed,
    });
  });
} catch {
  console.warn('TaskManager not available (Expo Go) — background tracking disabled');
}

/**
 * Solicita permisos de ubicación (foreground + background).
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  try {
    const { status: background } =
      await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') {
      console.warn('Background location permission not granted');
    }
  } catch {
    console.warn('Background permissions not available (Expo Go)');
  }

  return true;
};

/**
 * Inicia el tracking GPS en background.
 * En Expo Go, no hace nada — el tracking foreground se maneja via interval.
 */
export const startBackgroundTracking = async (): Promise<void> => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME,
    ).catch(() => false);

    if (hasStarted) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10_000,
      distanceInterval: 30,
      deferredUpdatesInterval: 10_000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Pide ya - Entrega activa',
        notificationBody: 'Compartiendo tu ubicación con el cliente',
        notificationColor: '#2D8B7A',
      },
    });
  } catch {
    console.warn('Background tracking not available (Expo Go)');
  }
};

/**
 * Detiene el tracking GPS.
 */
export const stopBackgroundTracking = async (): Promise<void> => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME,
    ).catch(() => false);

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // Ignore in Expo Go
  }

  setActiveOrderId(null);
};

/**
 * Obtiene la ubicación actual una vez.
 */
export const getCurrentLocation =
  async (): Promise<Location.LocationObject> => {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  };
