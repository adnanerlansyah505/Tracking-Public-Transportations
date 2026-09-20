export interface Coordinates {
  latitude: number;
  longitude: number;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compass bearing in degrees from `a` to `b` (0 = north, 90 = east). */
export function bearingDegrees(a: Coordinates, b: Coordinates) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS_LABELS = [
  'Utara',
  'Timur Laut',
  'Timur',
  'Tenggara',
  'Selatan',
  'Barat Daya',
  'Barat',
  'Barat Laut',
];

/** Human direction for a bearing, used in notification copy. */
export function compassLabel(bearing: number) {
  return COMPASS_LABELS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export interface CityCenter {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * City centres used to work out where a visitor is without calling an external
 * geocoder. Add a city here and its routes become discoverable.
 */
export const INDONESIA_CITIES: CityCenter[] = [
  { name: 'Bandung', latitude: -6.9175, longitude: 107.6191 },
  { name: 'Cimahi', latitude: -6.8722, longitude: 107.5425 },
  { name: 'Cikarang', latitude: -6.2722, longitude: 107.145 },
  { name: 'Bekasi', latitude: -6.2383, longitude: 106.9756 },
  { name: 'Jakarta', latitude: -6.2088, longitude: 106.8456 },
  { name: 'Depok', latitude: -6.4025, longitude: 106.7942 },
  { name: 'Bogor', latitude: -6.5971, longitude: 106.806 },
  { name: 'Tangerang', latitude: -6.1783, longitude: 106.6319 },
  { name: 'Karawang', latitude: -6.3015, longitude: 107.3062 },
  { name: 'Purwakarta', latitude: -6.5569, longitude: 107.4433 },
  { name: 'Sukabumi', latitude: -6.9277, longitude: 106.93 },
  { name: 'Semarang', latitude: -6.9667, longitude: 110.4167 },
  { name: 'Yogyakarta', latitude: -7.7956, longitude: 110.3695 },
  { name: 'Surakarta', latitude: -7.5755, longitude: 110.8243 },
  { name: 'Malang', latitude: -7.9666, longitude: 112.6326 },
  { name: 'Surabaya', latitude: -7.2575, longitude: 112.7521 },
  { name: 'Denpasar', latitude: -8.6705, longitude: 115.2126 },
  { name: 'Medan', latitude: 3.5952, longitude: 98.6722 },
  { name: 'Palembang', latitude: -2.9761, longitude: 104.7754 },
  { name: 'Pekanbaru', latitude: 0.5071, longitude: 101.4478 },
  { name: 'Balikpapan', latitude: -1.2379, longitude: 116.8529 },
  { name: 'Samarinda', latitude: -0.5022, longitude: 117.1536 },
  { name: 'Makassar', latitude: -5.1477, longitude: 119.4327 },
  { name: 'Manado', latitude: 1.4748, longitude: 124.8421 },
];

/**
 * Beyond this the nearest centre is not a believable match, so the caller is
 * treated as being outside the supported network.
 */
export const CITY_MATCH_RADIUS_KM = 60;

export function findNearestCity(origin: Coordinates) {
  let best: { city: CityCenter; distanceKm: number } | null = null;

  for (const city of INDONESIA_CITIES) {
    const distanceKm = haversineKm(origin, city);
    if (!best || distanceKm < best.distanceKm) {
      best = { city, distanceKm };
    }
  }

  if (!best || best.distanceKm > CITY_MATCH_RADIUS_KM) return null;

  return best;
}

/** Loose comparison so "Kota Bandung", "bandung" and "Bandung " all match. */
export function normalizeCity(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

export function citiesMatch(a?: string | null, b?: string | null) {
  const left = normalizeCity(a);
  const right = normalizeCity(b);

  if (!left || !right) return false;

  return left.includes(right) || right.includes(left);
}
