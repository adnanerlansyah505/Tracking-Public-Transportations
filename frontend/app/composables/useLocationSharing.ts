interface Coordinates {
  latitude: number;
  longitude: number;
}

// Module-level so several components share one geolocation watch.
let watchId: number | null = null;
let lastSentAt = 0;
const MIN_INTERVAL_MS = 8000;

/**
 * Publishes the driver's position while they keep sharing enabled.
 *
 * The preference is remembered in a cookie so we only ask once, and the watch
 * resumes on the next visit if it was left on. State is shared, so the header
 * toggle and the map read the same position without a second GPS watch.
 */
export function useLocationSharing() {
  const { $api } = useNuxtApp();

  const enabled = useCookie<boolean>('driver_location_sharing', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: !import.meta.dev,
  });

  const sharing = useState<boolean>('driver-sharing', () => false);
  const busy = useState<boolean>('driver-sharing-busy', () => false);
  const error = useState<string>('driver-sharing-error', () => '');
  const position = useState<Coordinates | null>('driver-position', () => null);

  function clearWatch() {
    if (import.meta.client && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
  }

  function publish(fix: GeolocationPosition) {
    position.value = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };

    const now = Date.now();
    if (now - lastSentAt < MIN_INTERVAL_MS) return;
    lastSentAt = now;

    const { heading, speed } = fix.coords;
    const body: Record<string, number> = {
      latitude: fix.coords.latitude,
      longitude: fix.coords.longitude,
    };

    if (typeof heading === 'number' && Number.isFinite(heading)) body.heading = heading;
    if (typeof speed === 'number' && Number.isFinite(speed) && speed >= 0) {
      body.speedKmh = Math.round(speed * 3.6);
    }

    $api('/location/me', { method: 'PUT', body })
      .then(() => {
        // Only count as sharing once the server actually knows where we are,
        // so anything that reads `sharing` isn't racing this request.
        sharing.value = true;
      })
      .catch(() => {
        // A dropped ping is not fatal; the next position will retry.
      });
  }

  function enable() {
    if (!import.meta.client) return;

    if (!navigator.geolocation) {
      error.value = 'Perangkat ini tidak mendukung layanan lokasi.';
      return;
    }

    // Already watching — don't stack a second watch.
    if (watchId !== null) {
      sharing.value = true;
      return;
    }

    busy.value = true;
    error.value = '';
    enabled.value = true;

    watchId = navigator.geolocation.watchPosition(
      (fix) => {
        busy.value = false;
        publish(fix);
      },
      (failure) => {
        sharing.value = false;
        busy.value = false;
        enabled.value = false;
        error.value = failure.code === failure.PERMISSION_DENIED
          ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.'
          : 'Lokasi tidak dapat dibaca saat ini.';
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  async function disable() {
    clearWatch();
    sharing.value = false;
    enabled.value = false;

    try {
      await $api('/location/me', { method: 'DELETE' });
    } catch {
      // Already offline as far as the map is concerned.
    }
  }

  onMounted(() => {
    if (enabled.value) enable();
  });

  return { enabled, sharing, busy, error, position, enable, disable };
}
