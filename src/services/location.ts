import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateDriverLocation } from './delivery';

export const LOCATION_TASK_NAME = 'pideya-driver-bg-location';

// Estado compartido para el orderId activo
let activeOrderId: string | null = null;

export const setActiveOrderId = (orderId: string | null) => {
  activeOrderId = orderId;
};

/**
 * Define la tarea de background para tracking GPS.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
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

/**
 * Solicita permisos de ubicación (foreground + background).
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();

  // Background es deseable pero no bloqueante
  if (background !== 'granted') {
    console.warn('Background location permission not granted');
  }

  return true;
};

/**
 * Inicia el tracking GPS en background.
 */
export const startBackgroundTracking = async (): Promise<void> => {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME,
  ).catch(() => false);

  if (hasStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000, // cada 10 segundos
    distanceInterval: 30, // o cada 30 metros
    deferredUpdatesInterval: 10_000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Pide ya - Entrega activa',
      notificationBody: 'Compartiendo tu ubicación con el cliente',
      notificationColor: '#2D8B7A',
    },
  });
};

/**
 * Detiene el tracking GPS.
 */
export const stopBackgroundTracking = async (): Promise<void> => {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME,
  ).catch(() => false);

  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
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
