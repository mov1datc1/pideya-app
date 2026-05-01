/**
 * Estilo de mapa premium — Pide ya
 * Inspirado en Uber/Rappi: fondo gris claro, calles blancas,
 * sin POIs ni iconos de negocio. La ruta y marcadores son el foco.
 */
export const PIDEYA_MAP_STYLE = [
  // ── Base: gris claro ──────────────────────────────
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  // ── Labels: texto gris sutil ──────────────────────
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5f5' }],
  },
  // ── Quitar TODOS los iconos de negocios ───────────
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // ── Administración ────────────────────────────────
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
  // ── POIs (restaurantes, tiendas, etc) ─────────────
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e8e8e8' }],
  },
  // ── Calles ────────────────────────────────────────
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e8e8e8' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#e0e0e0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d5d5d5' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  // ── Tránsito ──────────────────────────────────────
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  // ── Agua ──────────────────────────────────────────
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }],
  },
];
