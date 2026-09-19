<script setup lang="ts">
import type { TransitRoute, AngkotVehicle } from '~/data/transitData';

definePageMeta({ layout: 'web' });

const routesStore = useRoutesStore();
const { message } = useApiError();

const mapboxMapRef = ref<any>(null);
const activeRouteId = ref<string | null>(null);
const selectedVehicleId = ref<string | null>(null);
const searchQuery = ref('');
const isSimulating = ref(true);

const loading = ref(true);
const error = ref('');

// Routes come from the API; vehicles are simulated on top of those routes.
const routes = computed(() => routesStore.routes);
const vehicles = ref<AngkotVehicle[]>([]);

const hasRoutes = computed(() => routes.value.length > 0);

async function load() {
  loading.value = true;
  error.value = '';

  try {
    await routesStore.fetchPublicRoutes({ limit: 100 });
  } catch (cause) {
    error.value = message(cause, 'Kami tidak dapat memuat data trayek saat ini.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const quickFilters = computed(() => routes.value.slice(0, 4).map((route) => route.code));

const activeRoute = computed(() => {
  if (!activeRouteId.value) return null;
  return routes.value.find((route) => route.id === activeRouteId.value) ?? null;
});

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

const filteredVehicles = computed(() => {
  let list = vehicles.value;

  if (activeRouteId.value) {
    list = list.filter((vehicle) => vehicle.routeId === activeRouteId.value);
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return list;

  return list.filter(
    (vehicle) =>
      vehicle.plateNumber.toLowerCase().includes(query) ||
      vehicle.driverName.toLowerCase().includes(query) ||
      vehicle.angkotCode.toLowerCase().includes(query) ||
      vehicle.routeName.toLowerCase().includes(query),
  );
});

const selectedVehicle = computed(
  () => vehicles.value.find((vehicle) => vehicle.id === selectedVehicleId.value) ?? null,
);

function routeColor(routeId: string) {
  return routes.value.find((route) => route.id === routeId)?.color ?? '#123d8d';
}

function handleVehiclesUpdate(next: AngkotVehicle[]) {
  vehicles.value = next;
}

function handleSelectVehicle(vehicle: AngkotVehicle | null) {
  selectedVehicleId.value = vehicle ? vehicle.id : null;
}

function handleSelectRoute(route: TransitRoute | null) {
  activeRouteId.value = route ? route.id : null;
  selectedVehicleId.value = null;
}

function toggleRouteFilter(routeId: string) {
  if (activeRouteId.value === routeId) {
    activeRouteId.value = null;
  } else {
    activeRouteId.value = routeId;
    selectedVehicleId.value = null;
  }
}

function focusVehicle(vehicle: AngkotVehicle) {
  selectedVehicleId.value = vehicle.id;
  mapboxMapRef.value?.flyToVehicle(vehicle);
}

function focusRoute(route: TransitRoute) {
  activeRouteId.value = route.id;
  selectedVehicleId.value = null;
  mapboxMapRef.value?.flyToRoute(route);
}

function clearAllFilters() {
  activeRouteId.value = null;
  selectedVehicleId.value = null;
  searchQuery.value = '';
  mapboxMapRef.value?.resetMapCenter();
}

function getCapacityColor(current: number, max: number): { bg: string; text: string; bar: string } {
  const ratio = max > 0 ? current / max : 0;
  if (ratio >= 0.9) return { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' };
  if (ratio >= 0.7) return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' };
}
</script>

<template>
  <div class="bg-slate-100 pb-20 text-slate-900">
    <!-- Header Command Bar -->
    <section class="border-b border-slate-200 bg-white py-6">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-xs font-semibold text-emerald-700">Peta Trayek Live</span>
            </div>

            <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pemantauan Angkot Bandung
            </h1>
            <p class="mt-1 max-w-2xl text-xs text-slate-600 sm:text-sm">
              Jelajahi trayek angkot, halte, tarif, dan estimasi waktu tiba di seluruh koridor utama.
            </p>
          </div>

          <!-- Search Box -->
          <div class="w-full shrink-0 md:w-80">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Cari trayek, halte, atau kode..."
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
                v-for="code in quickFilters"
                :key="code"
                type="button"
                class="cursor-pointer underline hover:text-blue-700"
                @click="searchQuery = code"
              >
                {{ code }}
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
          Belum ada trayek yang dipublikasikan
        </h2>
        <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Jaringan trayek akan muncul di sini setelah administrator menyetujui dan mempublikasikan rute.
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
              :selected-vehicle-id="selectedVehicleId"
              :active-route-id="activeRouteId"
              :is-simulating="isSimulating"
              @select-vehicle="handleSelectVehicle"
              @select-route="handleSelectRoute"
              @update:vehicles="handleVehiclesUpdate"
            />
          </div>

          <p class="flex items-center gap-1.5 text-[11px] text-slate-400">
            <UIcon
              name="i-lucide-info"
              class="h-3.5 w-3.5 shrink-0"
            />
            Posisi armada masih disimulasikan di atas trayek asli sampai pelaporan GPS pengemudi aktif.
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

          <!-- Selected Vehicle Card -->
          <div
            v-if="selectedVehicle"
            class="rounded-2xl border-2 border-blue-600 bg-white p-4 shadow-md transition"
          >
            <div class="flex items-start justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
                  :style="{ backgroundColor: routeColor(selectedVehicle.routeId) }"
                >
                  {{ selectedVehicle.angkotCode }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold tracking-tight text-slate-900">{{ selectedVehicle.plateNumber }}</span>
                    <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Aktif</span>
                  </div>
                  <p class="text-xs text-slate-500">
                    {{ selectedVehicle.routeName }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="cursor-pointer rounded-md p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Tutup detail"
                @click="selectedVehicleId = null"
              >
                ✕
              </button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-xl bg-slate-50 p-2.5">
                <span class="block text-[10px] font-semibold text-slate-500">Pengemudi</span>
                <span class="mt-0.5 block truncate font-bold text-slate-900">{{ selectedVehicle.driverName }}</span>
              </div>
              <div class="rounded-xl bg-slate-50 p-2.5">
                <span class="block text-[10px] font-semibold text-slate-500">Kecepatan</span>
                <span class="mt-0.5 block font-bold text-slate-900">{{ selectedVehicle.speedKmH }} km/jam</span>
              </div>
            </div>

            <div class="mt-3 rounded-xl bg-slate-50 p-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-[11px] font-medium text-slate-600">Kapasitas Kursi</span>
                <span
                  class="font-bold"
                  :class="getCapacityColor(selectedVehicle.currentCapacity, selectedVehicle.maxCapacity).text"
                >
                  {{ selectedVehicle.currentCapacity }} / {{ selectedVehicle.maxCapacity }} Penumpang
                </span>
              </div>
              <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getCapacityColor(selectedVehicle.currentCapacity, selectedVehicle.maxCapacity).bar"
                  :style="{ width: `${Math.min(100, (selectedVehicle.currentCapacity / selectedVehicle.maxCapacity) * 100)}%` }"
                />
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-3">
              <div class="min-w-0">
                <span class="block text-[10px] font-semibold uppercase tracking-wider text-blue-700">Pemberhentian Berikutnya</span>
                <span class="mt-0.5 block truncate text-xs font-bold text-slate-900">{{ selectedVehicle.nextStopName }}</span>
              </div>
              <div class="shrink-0 text-right">
                <span class="block text-[10px] font-medium text-slate-500">Estimasi Tiba</span>
                <span class="text-xs font-black text-blue-800">~{{ selectedVehicle.etaMinutes }} Menit</span>
              </div>
            </div>
          </div>

          <!-- Active Angkot List -->
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <h2 class="text-xs font-bold text-slate-900">
                  Armada Beroperasi
                </h2>
                <p class="text-[10px] text-slate-500">
                  Klik kendaraan untuk fokus di peta
                </p>
              </div>
              <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                {{ filteredVehicles.length }}
              </span>
            </div>

            <div class="max-h-[280px] divide-y divide-slate-100 overflow-y-auto">
              <div
                v-if="filteredVehicles.length === 0"
                class="p-6 text-center text-xs text-slate-400"
              >
                Tidak ada kendaraan yang sesuai filter.
              </div>

              <button
                v-for="vehicle in filteredVehicles"
                :key="vehicle.id"
                type="button"
                class="flex w-full cursor-pointer items-center justify-between p-3 text-left transition hover:bg-slate-50"
                :class="selectedVehicleId === vehicle.id ? 'bg-blue-50/50' : ''"
                @click="focusVehicle(vehicle)"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                    :style="{ backgroundColor: routeColor(vehicle.routeId) }"
                  >
                    {{ vehicle.angkotCode }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900">{{ vehicle.plateNumber }}</p>
                    <p class="truncate text-[11px] text-slate-500">{{ vehicle.nextStopName }}</p>
                  </div>
                </div>

                <div class="shrink-0 text-right">
                  <span class="block text-[11px] font-bold text-slate-700">{{ vehicle.speedKmH }} km/jam</span>
                  <span class="block text-[10px] font-semibold text-emerald-700">ETA {{ vehicle.etaMinutes }}m</span>
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
          Membantu penumpang dan pengemudi dengan peta trayek, estimasi waktu tiba, dan transparansi kapasitas di Kota Bandung.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
            📍
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Peta Trayek Interaktif
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Lihat setiap koridor, halte, dan pergerakan armada langsung di peta Mapbox.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl font-bold text-emerald-600">
            ⏱️
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Estimasi Waktu Tiba
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Ketahui perkiraan waktu tiba menuju halte tujuan untuk memangkas waktu menunggu.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-xl font-bold text-purple-600">
            👥
          </div>
          <h3 class="mb-1 text-base font-bold text-slate-900">
            Indikator Kapasitas
          </h3>
          <p class="text-xs leading-relaxed text-slate-500">
            Cek ketersediaan kursi sebelum naik lewat penanda kapasitas berwarna.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
