import { defineStore } from 'pinia';
import type { AngkotVehicle } from '~/data/transitData';

export interface ActiveDriver {
  userId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKmh: number | null;
  updatedAt: number;
  name: string;
  plateNumber: string | null;
  routeCode: string | null;
  startRoute: string | null;
  endRoute: string | null;
  capacity: number | null;
  city: string | null;
  distanceKm?: number;
  /** Compass bearing from the requested origin to this driver. */
  bearingDegrees?: number;
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

interface SearchResult {
  drivers: ActiveDriver[];
  nearest: ActiveDriver | null;
  radiusKm: number;
}

/** Someone who recently searched nearby — anonymous by design. */
export interface NearbyPassenger {
  distanceKm: number;
  requestedAt: number;
  /** Compass bearing from the driver to this passenger. */
  bearingDegrees: number;
  /** Only exposed while the passenger is close enough to navigate to. */
  latitude: number;
  longitude: number;
  /** True when the searcher was not signed in. */
  anonymous: boolean;
}

interface PassengerResult {
  passengers: NearbyPassenger[];
  sharing: boolean;
  radiusKm: number;
}

export const useLocationStore = defineStore('location', () => {
  const activeDrivers = ref<ActiveDriver[]>([]);
  const loading = ref(false);
  const searching = ref(false);
  const nearest = ref<ActiveDriver | null>(null);
  const searchError = ref('');

  /** Where the passenger is standing, used to draw the route to an angkot. */
  const origin = ref<{ latitude: number; longitude: number } | null>(null);
  const selectedDriverId = ref<string | null>(null);

  /** The angkot the passenger is heading to (nearest by default). */
  const targetAngkot = computed(() => {
    const list = activeDrivers.value;
    if (list.length === 0) return null;

    return list.find((driver) => driver.userId === selectedDriverId.value)
      ?? list.find((driver) => driver.userId === nearest.value?.userId)
      ?? list[0];
  });

  function selectDriver(userId: string | null) {
    selectedDriverId.value = userId;
  }

  /** Ignore repeat positions so the route map isn't redrawn on every refresh. */
  function setOrigin(position: { latitude: number; longitude: number }) {
    const current = origin.value;

    if (current && current.latitude === position.latitude && current.longitude === position.longitude) {
      return;
    }

    origin.value = { latitude: position.latitude, longitude: position.longitude };
  }

  const passengers = ref<NearbyPassenger[]>([]);
  const passengersSharing = ref(true);
  const passengersRadiusKm = ref(5);
  const loadingPassengers = ref(false);
  const selectedPassengerAt = ref<number | null>(null);

  /** The passenger the driver is currently navigating to (nearest by default). */
  const targetPassenger = computed(() => {
    if (passengers.value.length === 0) return null;

    return passengers.value.find((entry) => entry.requestedAt === selectedPassengerAt.value)
      ?? passengers.value[0];
  });

  function selectPassenger(requestedAt: number | null) {
    selectedPassengerAt.value = requestedAt;
  }

  /** Active drivers, optionally limited to a city and sorted from an origin. */
  async function fetchActiveDrivers(options?: {
    city?: string | null;
    latitude?: number;
    longitude?: number;
  }) {
    const { $api } = useNuxtApp();

    // The landing page already knows where the visitor stands, so the route to
    // an angkot has a starting point even before they search.
    if (options?.latitude !== undefined && options?.longitude !== undefined) {
      setOrigin({ latitude: options.latitude, longitude: options.longitude });
    }

    loading.value = true;

    try {
      const response = await $api<ApiResponse<{ drivers: ActiveDriver[] }>>('/location/active-drivers', {
        query: {
          city: options?.city || undefined,
          latitude: options?.latitude,
          longitude: options?.longitude,
        },
      });

      activeDrivers.value = Array.isArray(response.data?.drivers) ? response.data.drivers : [];
      return activeDrivers.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Visitors without an account must still be findable by drivers, so the
   * browser keeps an opaque id to search under — no personal data in it.
   */
  const visitorCookie = useCookie<string>('visitor_id', {
    default: () => '',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  function visitorId() {
    if (!visitorCookie.value) {
      visitorCookie.value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    return visitorCookie.value;
  }

  /** Ask the API who is nearby and where they are relative to the searcher. */
  async function searchNearby(position: { latitude: number; longitude: number }) {
    const { $api } = useNuxtApp();
    searching.value = true;
    searchError.value = '';

    try {
      const response = await $api<ApiResponse<SearchResult>>('/location/search', {
        method: 'POST',
        body: { ...position, visitorId: visitorId() },
      });

      const drivers = Array.isArray(response.data?.drivers) ? response.data.drivers : [];
      activeDrivers.value = drivers;
      nearest.value = response.data?.nearest ?? null;
      setOrigin({ latitude: position.latitude, longitude: position.longitude });

      return { drivers, nearest: nearest.value, radiusKm: response.data?.radiusKm ?? 5 };
    } finally {
      searching.value = false;
    }
  }

  /** Live drivers shaped for the map markers. */
  const mapVehicles = computed<AngkotVehicle[]>(() =>
    activeDrivers.value.map((driver) => ({
      id: driver.userId,
      plateNumber: driver.plateNumber ?? driver.name,
      angkotCode: driver.routeCode ?? '—',
      routeId: '',
      routeName: driver.routeCode ? `Trayek ${driver.routeCode}` : 'Tidak diketahui',
      driverName: driver.name,
      currentCapacity: 0,
      maxCapacity: driver.capacity ?? 0,
      speedKmH: Math.round(driver.speedKmh ?? 0),
      status: 'active',
      currentCoordinates: [driver.longitude, driver.latitude] as [number, number],
      currentHeading: driver.heading ?? 0,
      nextStopName: driver.endRoute ?? '',
      etaMinutes: 0,
      progressPercent: 0,
      direction: 1,
    })),
  );

  /** Drivers: who is looking for an angkot nearby right now. */
  async function fetchPassengers() {
    const { $api } = useNuxtApp();
    loadingPassengers.value = true;

    try {
      const response = await $api<ApiResponse<PassengerResult>>('/location/passengers');

      passengers.value = Array.isArray(response.data?.passengers) ? response.data.passengers : [];
      passengersSharing.value = response.data?.sharing ?? true;
      passengersRadiusKm.value = response.data?.radiusKm ?? 5;

      return passengers.value;
    } finally {
      loadingPassengers.value = false;
    }
  }

  return {
    activeDrivers,
    loading,
    searching,
    nearest,
    searchError,
    origin,
    selectedDriverId,
    targetAngkot,
    selectDriver,
    passengers,
    passengersSharing,
    passengersRadiusKm,
    loadingPassengers,
    selectedPassengerAt,
    targetPassenger,
    mapVehicles,
    fetchActiveDrivers,
    searchNearby,
    fetchPassengers,
    selectPassenger,
  };
});
