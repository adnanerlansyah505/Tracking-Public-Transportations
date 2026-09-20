<script setup lang="ts">
import type { ActiveDriver } from '~/stores/location';

/**
 * The passenger's mirror of the driver route panel: the way from where the
 * passenger is standing to the angkot they picked (or the nearest one).
 */
const props = defineProps<{ driver?: ActiveDriver | null }>();

const location = useLocationStore();

const summary = ref<{ distanceKm: number; durationMin: number } | null>(null);

const origin = computed(() => location.origin);
const target = computed(() => props.driver ?? location.targetAngkot);

const point = computed(() => (target.value
  ? { latitude: target.value.latitude, longitude: target.value.longitude }
  : null));

const vehicleLabel = computed(() =>
  target.value?.plateNumber || target.value?.routeCode || 'angkot');

const meta = computed(() => {
  const driver = target.value;
  if (!driver) return '';

  const distance = driver.distanceKm !== undefined
    ? `· ${driver.distanceKm.toFixed(1)} km`
    : '';
  const heading = driver.bearingDegrees !== undefined
    ? `· arah ${compassLabel(driver.bearingDegrees)}`
    : '';

  return [distance, heading].filter(Boolean).join(' ');
});
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">
          Rute ke angkot
        </h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Jalan dari posisi Anda menuju {{ vehicleLabel }}.
        </p>
      </div>

      <div
        v-if="summary"
        class="text-right"
      >
        <p class="text-sm font-bold text-slate-900">
          {{ summary.distanceKm.toFixed(1) }} km
        </p>
        <p class="text-[11px] text-slate-500">
          ~{{ summary.durationMin }} menit berkendara
        </p>
      </div>
    </div>

    <!-- Nothing can be drawn before the browser knows where the passenger is. -->
    <p
      v-if="!origin"
      class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
    >
      Cari angkot terdekat lebih dulu agar posisi Anda terkirim dan rute dapat ditampilkan.
    </p>

    <p
      v-else-if="!point"
      class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
    >
      Belum ada angkot yang bisa dituju. Pilih satu dari daftar armada aktif.
    </p>

    <RouteMap
      v-else
      :from="origin"
      :to="point"
      from-label="Anda"
      from-glyph="A"
      from-color="#123d8d"
      to-label="Angkot"
      to-glyph="K"
      to-color="#f59e0b"
      line-color="#123d8d"
      :meta="meta"
      @summary="summary = $event"
    />
  </section>
</template>
