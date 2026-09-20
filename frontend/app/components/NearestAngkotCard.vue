<script setup lang="ts">
import { useApiError } from '~/composables/useApiError';

const location = useLocationStore();
const { message } = useApiError();

const locating = ref(false);
const error = ref('');
const searched = ref(false);

function readPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!import.meta.client || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
  });
}

async function find() {
  error.value = '';
  locating.value = true;

  try {
    const position = await readPosition();

    await location.searchNearby({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    searched.value = true;
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'unsupported') {
      error.value = 'Perangkat ini tidak mendukung layanan lokasi.';
    } else if (typeof (cause as GeolocationPositionError)?.code === 'number') {
      error.value = (cause as GeolocationPositionError).code === 1
        ? 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser Anda.'
        : 'Lokasi Anda tidak dapat dibaca saat ini.';
    } else {
      error.value = message(cause, 'Tidak dapat mencari angkot terdekat.');
    }
  } finally {
    locating.value = false;
  }
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">
          Angkot terdekat
        </h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Bagikan lokasi Anda untuk menemukan angkot yang sedang aktif di sekitar. Ketuk salah satu untuk
          melihat rute dari posisi Anda.
        </p>
      </div>

      <UButton
        color="primary"
        icon="i-lucide-map-pin"
        :loading="locating"
        @click="find"
      >
        {{ searched ? 'Cari lagi' : 'Cari angkot terdekat' }}
      </UButton>
    </div>

    <p
      v-if="error"
      class="mt-3 text-xs text-rose-600"
    >
      {{ error }}
    </p>

    <p
      v-else-if="locating"
      class="mt-3 flex items-center gap-1.5 text-xs text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-3.5 w-3.5 animate-spin"
      />
      Membaca lokasi Anda…
    </p>

    <template v-else-if="searched">
      <p
        v-if="location.activeDrivers.length === 0"
        class="mt-3 rounded-lg bg-slate-50 text-xs text-slate-500"
      >
        Belum ada angkot yang membagikan lokasi dalam radius 5 km. Coba lagi nanti.
      </p>

      <ul
        v-else
        class="mt-3 divide-y divide-slate-100"
      >
        <li
          v-for="(driver, index) in location.activeDrivers"
          :key="driver.userId"
        >
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg py-3 pr-1 text-left transition hover:bg-slate-50"
            :class="location.selectedDriverId === driver.userId ? 'bg-blue-50/60 px-2' : ''"
            @click="location.selectDriver(location.selectedDriverId === driver.userId ? null : driver.userId)"
          >
            <div class="min-w-0">
              <p class="truncate text-xs font-semibold text-slate-800">
                {{ driver.plateNumber || driver.name }}
                <span
                  v-if="driver.routeCode"
                  class="ml-1 font-normal text-slate-500"
                >· {{ driver.routeCode }}</span>
              </p>
              <p class="truncate text-[11px] text-slate-500">
                {{ index === 0 ? 'Terdekat' : (driver.startRoute || '—') }}
              </p>
            </div>

            <DirectionPointer
              size="sm"
              :bearing="driver.bearingDegrees ?? 0"
              :distance-km="driver.distanceKm ?? null"
            />
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>
