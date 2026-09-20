<script setup lang="ts">
import type { RouteStopInput } from '~/data/transitData';

const stops = defineModel<RouteStopInput[]>({ required: true });

const ZONE_OPTIONS = ['North', 'South', 'East', 'West', 'Central'].map((zone) => ({
  label: zone,
  value: zone,
}));

function addStop() {
  stops.value = [...stops.value, { name: '', zone: 'Central', latitude: 0, longitude: 0 }];
}

function removeStop(index: number) {
  if (stops.value.length <= 2) return;
  stops.value = stops.value.filter((_, current) => current !== index);
}

function moveStop(index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= stops.value.length) return;

  const next = [...stops.value];
  const current = next[index];
  const swapped = next[target];
  if (!current || !swapped) return;

  next[index] = swapped;
  next[target] = current;
  stops.value = next;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(a: RouteStopInput, b: RouteStopInput) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(Number(a.latitude));
  const lat2 = toRadians(Number(b.latitude));
  const deltaLat = toRadians(Number(b.latitude) - Number(a.latitude));
  const deltaLng = toRadians(Number(b.longitude) - Number(a.longitude));

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

const totalKm = computed(() => {
  let sum = 0;
  for (let index = 1; index < stops.value.length; index += 1) {
    const previous = stops.value[index - 1];
    const current = stops.value[index];
    if (previous && current) sum += distanceKm(previous, current);
  }
  return sum;
});

const hasDuplicateCoordinates = computed(() => {
  const seen = new Set<string>();
  for (const stop of stops.value) {
    const key = `${Number(stop.latitude)},${Number(stop.longitude)}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
});
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          Travel path
        </h3>
        <p class="mt-0.5 text-xs text-slate-500">
          Stops are visited in order — the map path is drawn between them.
        </p>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="soft"
        size="sm"
        type="button"
        @click="addStop"
      >
        Add stop
      </UButton>
    </div>

    <div
      v-for="(stop, index) in stops"
      :key="index"
      class="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#123d8d] text-[11px] font-bold text-white">
            {{ index + 1 }}
          </span>
          <span class="text-xs font-semibold text-slate-700">
            {{ index === 0 ? 'Origin stop' : index === stops.length - 1 ? 'Destination stop' : `Stop ${index + 1}` }}
          </span>
        </div>

        <div class="flex items-center gap-0.5">
          <UButton
            icon="i-lucide-arrow-up"
            color="neutral"
            variant="ghost"
            size="xs"
            type="button"
            :disabled="index === 0"
            aria-label="Move stop up"
            @click="moveStop(index, -1)"
          />
          <UButton
            icon="i-lucide-arrow-down"
            color="neutral"
            variant="ghost"
            size="xs"
            type="button"
            :disabled="index === stops.length - 1"
            aria-label="Move stop down"
            @click="moveStop(index, 1)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            type="button"
            :disabled="stops.length <= 2"
            aria-label="Remove stop"
            @click="removeStop(index)"
          />
        </div>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <UFormField label="Stop name">
          <UInput
            v-model="stop.name"
            placeholder="e.g. Terminal Cicaheum"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Zone">
          <USelect
            v-model="stop.zone"
            :items="ZONE_OPTIONS"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Latitude">
          <UInput
            v-model="stop.latitude"
            type="number"
            step="any"
            placeholder="-6.9031"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Longitude">
          <UInput
            v-model="stop.longitude"
            type="number"
            step="any"
            placeholder="107.6575"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        {{ stops.length }} stops · approx. {{ totalKm.toFixed(1) }} km
      </span>
      <span
        v-if="hasDuplicateCoordinates"
        class="text-amber-600"
      >
        Two stops share the same coordinates.
      </span>
    </div>
  </div>
</template>
