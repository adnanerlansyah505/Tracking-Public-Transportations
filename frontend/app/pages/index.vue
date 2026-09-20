<script setup lang="ts">
import type { AngkotVehicle, TransitRoute } from '~/data/transitData';
import type { ActiveDriver } from '~/stores/location';

definePageMeta({ layout: 'web' });

const routesStore = useRoutesStore();
const location = useLocationStore();
const auth = useAuthStore();
const { message } = useApiError();

const isDriver = computed(() => auth.user?.role === 'driver');

const { city, coords, detecting, error: cityError, detect } = useCurrentCity();
const cityName = computed(() => city.value?.name ?? null);

const mapboxMapRef = ref<any>(null);
const activeRouteId = ref<string | null>(null);
const selectedDriverId = ref<string | null>(null);
const searchQuery = ref('');
const loading = ref(true);
const error = ref('');

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const routes = computed(() => routesStore.routes);
const drivers = computed(() => location.activeDrivers);
const hasRoutes = computed(() => routes.value.length > 0);

/** Load the network for whichever city the visitor is standing in. */
async function load() {
  loading.value = true;
  error.value = '';

  try {
    await routesStore.fetchPublicRoutes({ limit: 100, city: cityName.value ?? undefined });
    await refreshDrivers();
  } catch (cause) {
    error.value = message(cause, 'Kami tidak dapat memuat data trayek saat ini.');
  } finally {
    loading.value = false;
  }
}

function refreshDrivers() {
  return location
    .fetchActiveDrivers({
      city: cityName.value,
      latitude: coords.value?.latitude,
      longitude: coords.value?.longitude,
    })
    .catch(() => undefined);
}

async function redetect() {
  await detect(true);
  await load();
}

onMounted(() => {
  // Find the visitor's city first, then load that city's network.
  detect().then(load);

  // Live positions refresh on a short interval so the map stays current.
  refreshTimer = setInterval(refreshDrivers, 15000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

const quickFilters = computed(() => routes.value.slice(0, 2).map((route) => route.name));

const activeRoute = computed(() =>
  activeRouteId.value ? routes.value.find((route) => route.id === activeRouteId.value) ?? null : null);

const selectedDriver = computed(() =>
  drivers.value.find((driver) => driver.userId === selectedDriverId.value) ?? null);

const filteredRoutes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return routes.value;

  return routes.value.filter(
    (route) =>
      route.name.toLowerCase().includes(query) ||
      route.code.toLowerCase().includes(query) ||
      route.origin.toLowerCase().includes(query) ||
      route.destination.toLowerCase().includes(query) ||
      route.stops.some((stop) => stop.name.toLowerCase().includes(query)),
  );
});

const filteredDrivers = computed(() => {
  let list = drivers.value;

  if (activeRoute.value) {
    list = list.filter((driver) => driver.routeCode === activeRoute.value?.code);
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return list;

  return list.filter((driver) =>
    [driver.plateNumber, driver.name, driver.routeCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
});

function driverColor(driver: ActiveDriver) {
  return routes.value.find((route) => route.code === driver.routeCode)?.color ?? '#123d8d';
}

function updatedAgo(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds} detik lalu`;

  return `${Math.round(seconds / 60)} menit lalu`;
}

function handleSelectVehicle(vehicle: AngkotVehicle | null) {
  selectedDriverId.value = vehicle ? vehicle.id : null;
}

function handleSelectRoute(route: TransitRoute | null) {
  activeRouteId.value = route ? route.id : null;
  selectedDriverId.value = null;
}

function toggleRouteFilter(routeId: string) {
  if (activeRouteId.value === routeId) {
    activeRouteId.value = null;
  } else {
    activeRouteId.value = routeId;
    selectedDriverId.value = null;
  }
}

function focusDriver(driver: ActiveDriver) {
  selectedDriverId.value = driver.userId;

  const vehicle = location.mapVehicles.find((entry) => entry.id === driver.userId);
  if (vehicle) mapboxMapRef.value?.flyToVehicle(vehicle);
}

function focusRoute(route: TransitRoute) {
  activeRouteId.value = route.id;
  selectedDriverId.value = null;
  mapboxMapRef.value?.flyToRoute(route);
}

function clearAllFilters() {
  activeRouteId.value = null;
  selectedDriverId.value = null;
  searchQuery.value = '';
  mapboxMapRef.value?.resetMapCenter();
}
</script>

<template>
  <div class="bg-slate-100 pb-20 text-slate-900">
    <!-- Header Command Bar -->
    <section class="border-b border-slate-200 bg-white py-6">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <!-- Which city the visitor is being shown -->
              <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <UIcon
                  name="i-lucide-map-pin"
                  class="h-3.5 w-3.5 text-[#123d8d]"
                />
                <template v-if="detecting">
                  Mendeteksi kota…
                </template>
                <template v-else-if="cityName">
                  {{ cityName }}
                </template>
                <template v-else>
                  Seluruh jaringan
                </template>
                <!-- <button
                  type="button"
                  class="ml-0.5 cursor-pointer rounded px-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  title="Deteksi ulang kota"
                  @click="redetect"
                >
                  ↻
                </button> -->
              </span>

              <span
                class="inline-flex items-center gap-1.5 text-xs font-semibold"
                :class="drivers.length ? 'text-emerald-700' : 'text-slate-500'"
              >
                <span
                  class="inline-flex h-2.5 w-2.5 rounded-full"
                  :class="drivers.length ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'"
                />
                {{ drivers.length }} armada aktif
              </span>
            </div>

            <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {{ cityName ? `Pemantauan Angkot ${cityName}` : 'Pemantauan Angkot Bandung' }}
            </h1>
            <p class="mt-1 max-w-2xl text-xs text-slate-600 sm:text-sm">
              {{ isDriver
                ? 'Pantau armada yang sedang aktif dan temukan penumpang yang mencari angkot di sekitar Anda.'
                : 'Trayek dan armada di kota Anda dimuat otomatis dari lokasi Anda — pindah kota dan peta ikut berganti.' }}
            </p>

            <p
              v-if="cityError"
              class="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700"
            >
              <UIcon
                name="i-lucide-info"
                class="h-3.5 w-3.5 shrink-0"
              />
              {{ cityError }}
            </p>
          </div>

          <!-- Search Box -->
          <div class="w-full shrink-0 md:w-80">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Cari trayek, halte, atau plat..."
              size="lg"
              :ui="{
                base: 'bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white',
              }"
            />

            <div
              v-if="quickFilters.length"
              class="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500"
            >
              <span class="text-slate-400">Cepat:</span>

              <button
                v-for="name in quickFilters"
                :key="name"
                type="button"
                class="cursor-pointer underline hover:text-blue-700"
                @click="searchQuery = name"
              >
                {{ name }} {{ quickFilters[quickFilters.length - 1] !== name ? '·' : '' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Live Workspace -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Loading -->
      <div
        v-if="loading"
        class="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white"
      >
        <div class="flex flex-col items-center gap-3 text-slate-500">
          <UIcon
            name="i-lucide-loader-circle"
            class="h-6 w-6 animate-spin text-[#123d8d]"
          />
          <p class="text-xs font-medium">
            Memuat data trayek…
          </p>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"
      >
        <p class="text-sm font-semibold text-rose-800">
          {{ error }}
        </p>
        <p class="mt-1 text-xs text-rose-600">
          Periksa koneksi Anda lalu coba lagi.
        </p>
        <button
          type="button"
          class="mt-4 cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          @click="load"
        >
          Coba lagi
        </button>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!hasRoutes"
        class="rounded-2xl border border-slate-200 bg-white p-10 text-center"
      >
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <UIcon
            name="i-lucide-map"
            class="h-6 w-6"
          />
        </div>
        <h2 class="mt-4 text-base font-bold text-slate-900">
          {{ cityName ? `Belum ada trayek di ${cityName}` : 'Belum ada trayek yang dipublikasikan' }}
        </h2>
        <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {{ cityName
            ? `Belum ada rute yang dipublikasikan untuk ${cityName}. Coba deteksi ulang kota Anda, atau periksa kembali nanti.`
            : 'Jaringan trayek akan muncul di sini setelah administrator menyetujui dan mempublikasikan rute.' }}
        </p>
        <NuxtLink
          to="/register/driver"
          class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#123d8d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0d2f6a]"
        >
          <UIcon
            name="i-lucide-plus"
            class="h-3.5 w-3.5"
          />
          Daftar sebagai pengemudi
        </NuxtLink>
      </div>

      <!-- Workspace -->
      <div
        v-else
        class="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
      >
        <!-- Map + route cards (first on mobile) -->
        <div class="order-1 space-y-4 lg:order-2 lg:col-span-8">
          <div class="h-[340px] sm:h-[440px] lg:h-[560px]">
            <MapboxMap
              ref="mapboxMapRef"
              map-height="100%"
              :routes="routes"
              :vehicles="location.mapVehicles"
              :selected-vehicle-id="selectedDriverId"
              :active-route-id="activeRouteId"
              :is-simulating="false"
              @select-vehicle="handleSelectVehicle"
              @select-route="handleSelectRoute"
            />
          </div>

          <p class="flex items-center gap-1.5 text-[11px] text-slate-400">
            <UIcon
              name="i-lucide-info"
              class="h-3.5 w-3.5 shrink-0"
            />
            Posisi berasal dari pengemudi yang mengaktifkan berbagi lokasi dan diperbarui secara berkala.
          </p>

          <!-- Route Cards Grid -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-for="route in filteredRoutes"
              :key="route.id"
              type="button"
              class="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
              @click="focusRoute(route)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: route.color }"
                  />
                  <span class="text-xs font-black text-slate-900">{{ route.code }}</span>
                </div>
                <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{{ route.fare }}</span>
              </div>
              <p class="mt-1 line-clamp-1 text-xs font-semibold text-slate-700">{{ route.name }}</p>
              <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                <span>{{ route.stops.length }} Halte</span>
                <span>{{ route.operatingHours }}</span>
              </div>
            </button>

            <p
              v-if="filteredRoutes.length === 0"
              class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400"
            >
              Tidak ada trayek yang cocok dengan pencarian.
            </p>
          </div>
        </div>

        <!-- Side panel (second on mobile) -->
        <div class="order-2 space-y-4 lg:order-1 lg:col-span-4">
          <NearestPassengerCard v-if="isDriver" />
          <NearestAngkotCard v-else />

          <!-- Trayek Selector -->
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-bold text-slate-900">Pilih Trayek</span>
                <span class="text-xs font-semibold text-slate-400">({{ filteredRoutes.length }})</span>
              </div>
              <button
                v-if="activeRouteId || searchQuery"
                type="button"
                class="cursor-pointer rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                @click="clearAllFilters"
              >
                Reset Filter
              </button>
            </div>

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                v-for="route in filteredRoutes"
                :key="route.id"
                type="button"
                class="flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left transition"
                :class="activeRouteId === route.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'"
                @click="toggleRouteFilter(route.id)"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                    :style="{ backgroundColor: route.color, color: '#ffffff' }"
                  >
                    {{ route.code }}
                  </span>
                  <div class="min-w-0">
                    <p
                      class="truncate text-xs font-semibold"
                      :class="activeRouteId === route.id ? 'text-white' : 'text-slate-900'"
                    >
                      {{ route.name }}
                    </p>
                    <p
                      class="text-[10px]"
                      :class="activeRouteId === route.id ? 'text-slate-300' : 'text-slate-500'"
                    >
                      {{ route.stops.length }} Halte · {{ route.fare }}
                    </p>
                  </div>
                </div>
                <span
                  class="ml-2 h-2 w-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: route.color }"
                />
              </button>

              <p
                v-if="filteredRoutes.length === 0"
                class="p-4 text-center text-[11px] text-slate-400"
              >
                Tidak ada trayek yang cocok.
              </p>
            </div>
          </div>

          <!-- Selected driver -->
          <div
            v-if="selectedDriver"
            class="rounded-2xl border-2 border-blue-600 bg-white p-4 shadow-md"
          >
            <div class="flex items-start justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-10 w-14 items-center justify-center rounded-xl text-xs font-black text-white shadow-sm"
                  :style="{ backgroundColor: driverColor(selectedDriver) }"
                >
                  {{ selectedDriver.routeCode || '—' }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold tracking-tight text-slate-900">
                    {{ selectedDriver.plateNumber || selectedDriver.name }}
                  </p>
                  <p class="truncate text-xs text-slate-500">{{ selectedDriver.name }}</p>
                </div>
              </div>

              <button
                type="button"
                class="cursor-pointer rounded-md p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Tutup detail"
                @click="selectedDriverId = null"
              >
                ✕
              </button>
            </div>

            <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-xl bg-slate-50 p-2.5">
                <dt class="text-[10px] font-semibold text-slate-500">
                  Koridor
                </dt>
                <dd class="mt-0.5 truncate font-bold text-slate-900">
                  {{ selectedDriver.startRoute || '—' }} → {{ selectedDriver.endRoute || '—' }}
                </dd>
              </div>
              <div class="rounded-xl bg-slate-50 p-2.5">
                <dt class="text-[10px] font-semibold text-slate-500">
                  Kecepatan
                </dt>
                <dd class="mt-0.5 font-bold text-slate-900">
                  {{ Math.round(selectedDriver.speedKmh ?? 0) }} km/jam
                </dd>
              </div>
              <div
                v-if="selectedDriver.distanceKm !== undefined"
                class="rounded-xl bg-slate-50 p-2.5"
              >
                <dt class="text-[10px] font-semibold text-slate-500">
                  Jarak dari Anda
                </dt>
                <dd class="mt-0.5 font-bold text-slate-900">
                  {{ selectedDriver.distanceKm.toFixed(1) }} km
                </dd>
              </div>
              <div class="rounded-xl bg-slate-50 p-2.5">
                <dt class="text-[10px] font-semibold text-slate-500">
                  Diperbarui
                </dt>
                <dd class="mt-0.5 font-bold text-slate-900">
                  {{ updatedAgo(selectedDriver.updatedAt) }}
                </dd>
              </div>
            </dl>

            <!-- Which way to walk to reach this angkot -->
            <div
              v-if="selectedDriver.bearingDegrees !== undefined"
              class="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-2.5"
            >
              <DirectionPointer
                :bearing="selectedDriver.bearingDegrees"
                :distance-km="selectedDriver.distanceKm ?? null"
                label="Dari posisi Anda"
              />
            </div>
          </div>

          <!-- Which way to walk from here to the selected angkot -->
          <AngkotRouteMap
            v-if="selectedDriver"
            :driver="selectedDriver"
          />

          <!-- Active fleet -->
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <h2 class="text-xs font-bold text-slate-900">
                  Armada aktif
                </h2>
                <p class="text-[10px] text-slate-500">
                  Klik kendaraan untuk fokus di peta
                </p>
              </div>
              <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                {{ filteredDrivers.length }}
              </span>
            </div>

            <div class="max-h-[280px] divide-y divide-slate-100 overflow-y-auto">
              <p
                v-if="filteredDrivers.length === 0"
                class="p-6 text-center text-xs text-slate-400"
              >
                Belum ada armada yang membagikan lokasi.
              </p>

              <button
                v-for="driver in filteredDrivers"
                :key="driver.userId"
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left transition hover:bg-slate-50"
                :class="selectedDriverId === driver.userId ? 'bg-blue-50/50' : ''"
                @click="focusDriver(driver)"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white"
                    :style="{ backgroundColor: driverColor(driver) }"
                  >
                    {{ driver.routeCode || '—' }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900">
                      {{ driver.plateNumber || driver.name }}
                    </p>
                    <p class="truncate text-[11px] text-slate-500">
                      {{ driver.name }} · {{ updatedAgo(driver.updatedAt) }}
                    </p>
                  </div>
                </div>

                <div class="shrink-0 text-right">
                  <span class="block text-[11px] font-bold text-slate-700">{{ Math.round(driver.speedKmh ?? 0) }} km/jam</span>
                  <span
                    v-if="driver.distanceKm !== undefined"
                    class="block text-[10px] font-semibold text-emerald-700"
                  >
                    {{ driver.distanceKm.toFixed(1) }} km
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Stops Timeline -->
          <div
            v-if="activeRoute"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="mb-3 flex items-center justify-between">
              <div class="min-w-0">
                <h3 class="text-xs font-bold text-slate-900">
                  Halte Trayek {{ activeRoute.code }}
                </h3>
                <p class="truncate text-[10px] text-slate-500">
                  {{ activeRoute.origin }} ➔ {{ activeRoute.destination }}
                </p>
              </div>
              <span class="shrink-0 text-xs font-bold text-blue-700">{{ activeRoute.fare }}</span>
            </div>

            <div class="relative space-y-3 pl-4 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-0.5 before:bg-slate-200">
              <div
                v-for="(stop, index) in activeRoute.stops"
                :key="stop.id"
                class="relative flex items-center justify-between gap-3 text-xs"
              >
                <span
                  class="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-white"
                  :style="{ backgroundColor: index === 0 || index === activeRoute.stops.length - 1 ? activeRoute.color : '#94a3b8' }"
                />
                <div class="min-w-0">
                  <p class="truncate text-[11px] font-semibold leading-tight text-slate-900">{{ stop.name }}</p>
                  <p class="text-[10px] text-slate-400">{{ stop.zone }}</p>
                </div>
                <span
                  v-if="index === 0"
                  class="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700"
                >
                  Asal
                </span>
                <span
                  v-else-if="index === activeRoute.stops.length - 1"
                  class="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"
                >
                  Tujuan
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Features -->
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mx-auto mb-12 max-w-2xl text-center">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Smart City Transit Tracking
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          Membantu penumpang dan pengemudi dengan peta trayek, posisi armada, dan notifikasi angkot terdekat di Kota {{ cityName }}.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
            📍
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Posisi Armada Langsung
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Lihat posisi angkot yang mengaktifkan berbagi lokasi, langsung di peta Mapbox.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl font-bold text-emerald-600">
            ⏱️
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Angkot Terdekat
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Bagikan lokasi Anda untuk menemukan armada terdekat beserta jaraknya.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-xl font-bold text-purple-600">
            🔔
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Notifikasi Real-Time
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Pengemudi dan penumpang menerima pemberitahuan langsung saat armada atau penumpang berada di sekitar.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
