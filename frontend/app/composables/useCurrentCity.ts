interface DetectedCity {
  name: string;
  latitude: number;
  longitude: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Works out which city the visitor is in from their position, so the map can
 * switch to that city's network automatically. Nothing is shared with drivers —
 * this only decides what the visitor sees.
 */
export function useCurrentCity() {
  const { $api } = useNuxtApp();

  const city = useState<DetectedCity | null>('current-city', () => null);
  const coords = useState<Coordinates | null>('current-coords', () => null);
  const detecting = useState<boolean>('current-city-detecting', () => false);
  const error = useState<string>('current-city-error', () => '');
  const permissionDenied = useState<boolean>('current-city-denied', () => false);
  const detected = useState<boolean>('current-city-detected', () => false);

  function readPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      });
    });
  }

  async function detect(force = false) {
    if (!import.meta.client || !navigator.geolocation) {
      error.value = 'Perangkat ini tidak mendukung layanan lokasi.';
      return null;
    }

    // The browser caches the permission, so a repeat call is cheap — but don't
    // ask again on every mount.
    if (detected.value && !force) return city.value;

    detecting.value = true;
    error.value = '';
    permissionDenied.value = false;

    try {
      const position = await readPosition();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      coords.value = location;

      const response = await $api<{ data: { city: DetectedCity | null; matched: boolean } }>(
        '/location/city',
        { query: location },
      );

      city.value = response.data?.matched ? response.data.city : null;

      if (!response.data?.matched) {
        error.value = 'Kota Anda belum terdaftar di jaringan AngkotTracker.';
      }

      return city.value;
    } catch (cause) {
      if (typeof (cause as GeolocationPositionError)?.code === 'number') {
        permissionDenied.value = (cause as GeolocationPositionError).code === 1;
        error.value = permissionDenied.value
          ? 'Izin lokasi ditolak, jadi kami menampilkan seluruh jaringan.'
          : 'Lokasi Anda tidak dapat dibaca saat ini.';
      } else {
        error.value = 'Kota Anda tidak dapat dideteksi saat ini.';
      }

      return null;
    } finally {
      detecting.value = false;
      detected.value = true;
    }
  }

  return { city, coords, detecting, error, permissionDenied, detected, detect };
}
