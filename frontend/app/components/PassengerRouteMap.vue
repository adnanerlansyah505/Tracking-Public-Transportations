<script setup lang="ts">
const location = useLocationStore();
const { position, sharing } = useLocationSharing();

const summary = ref<{ distanceKm: number; durationMin: number } | null>(null);

const target = computed(() => location.targetPassenger);
const point = computed(() => (target.value
  ? { latitude: target.value.latitude, longitude: target.value.longitude }
  : null));

const meta = computed(() => (target.value
  ? `· ${target.value.distanceKm.toFixed(1)} km · arah ${compassLabel(target.value.bearingDegrees)}`
  : ''));
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">
          Rute ke penumpang
        </h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Jalan dari posisi Anda ke penumpang terdekat yang sedang mencari angkot.
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

    <!-- The driver must be sharing before a route can be drawn. -->
    <p
      v-if="!sharing"
      class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
    >
      Aktifkan <strong>berbagi lokasi</strong> lewat tombol “Lokasi” di header agar rute menuju penumpang
      dapat ditampilkan.
    </p>

    <p
      v-else-if="!location.passengers.length"
      class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
    >
      Belum ada penumpang yang mencari angkot di sekitar Anda, jadi belum ada rute untuk ditampilkan.
    </p>

    <RouteMap
      v-else-if="position && point"
      :from="position"
      :to="point"
      from-label="Anda"
      from-glyph="A"
      from-color="#123d8d"
      to-label="Penumpang"
      to-glyph="P"
      to-color="#f59e0b"
      line-color="#f59e0b"
      :meta="meta"
      @summary="summary = $event"
    />

    <p
      v-else
      class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
    >
      Menunggu posisi Anda terbaca…
    </p>
  </section>
</template>
