/**
 * Google Directions API service
 * Obtiene la ruta real (polyline) entre dos puntos para dibujar en el mapa.
 */

import Constants from 'expo-constants';

const GOOGLE_MAPS_KEY =
  Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

interface RouteResult {
  /** Decoded polyline coordinates */
  coordinates: { latitude: number; longitude: number }[];
  /** Human-readable duration (e.g. "12 mins") */
  duration: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Human-readable distance (e.g. "3.2 km") */
  distance: string;
  /** Distance in meters */
  distanceMeters: number;
}

/**
 * Decode Google Maps encoded polyline string into coordinate array.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Fetch driving directions between two points.
 * Returns decoded polyline coordinates + ETA + distance.
 */
export async function getDirectionsRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<RouteResult | null> {
  if (!GOOGLE_MAPS_KEY) {
    console.warn('Directions API: No API key found');
    return null;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      `&mode=driving` +
      `&language=es` +
      `&key=${GOOGLE_MAPS_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.warn('Directions API error:', data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const encodedPolyline = route.overview_polyline.points;

    return {
      coordinates: decodePolyline(encodedPolyline),
      duration: leg.duration.text,
      durationSeconds: leg.duration.value,
      distance: leg.distance.text,
      distanceMeters: leg.distance.value,
    };
  } catch (error) {
    console.warn('Directions API fetch error:', error);
    return null;
  }
}
