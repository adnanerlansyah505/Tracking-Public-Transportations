<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Compass bearing in degrees (0 = north). */
    bearing: number;
    distanceKm?: number | null;
    size?: 'sm' | 'md';
    label?: string;
  }>(),
  {
    distanceKm: null,
    size: 'md',
    label: '',
  },
);

const degrees = computed(() => compassDegrees(props.bearing));
const direction = computed(() => compassLabel(props.bearing));

const ringSize = computed(() => (props.size === 'sm' ? 'h-9 w-9' : 'h-14 w-14'));
const arrowSize = computed(() => (props.size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'));
const letterSize = computed(() => (props.size === 'sm' ? 'text-[6px]' : 'text-[8px]'));
const arrowOffset = computed(() => (props.size === 'sm' ? 'top-[3px]' : 'top-[5px]'));
</script>

<template>
  <div class="flex items-center gap-2.5">
    <!-- Compass rose: U/T/S/B are Utara/Timur/Selatan/Barat -->
    <div
      class="relative shrink-0 rounded-full border border-slate-200 bg-white"
      :class="ringSize"
      role="img"
      :aria-label="`Arah ${direction} (${degrees} derajat)`"
    >
      <span
        class="absolute inset-x-0 top-0.5 text-center font-bold text-slate-400"
        :class="letterSize"
      >U</span>
      <span
        class="absolute inset-y-0 right-0.5 flex items-center font-bold text-slate-400"
        :class="letterSize"
      >T</span>
      <span
        class="absolute inset-x-0 bottom-0.5 text-center font-bold text-slate-400"
        :class="letterSize"
      >S</span>
      <span
        class="absolute inset-y-0 left-0.5 flex items-center font-bold text-slate-400"
        :class="letterSize"
      >B</span>

      <!-- Pointer rotates to the bearing, so it always aims at the other party -->
      <span
        class="absolute inset-0 transition-transform duration-300"
        :style="{ transform: `rotate(${degrees}deg)` }"
      >
        <UIcon
          name="i-lucide-navigation"
          class="absolute left-1/2 -translate-x-1/2 text-[#123d8d]"
          :class="[arrowSize, arrowOffset]"
        />
      </span>

      <span class="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" />
    </div>

    <div class="min-w-0">
      <p class="truncate text-xs font-semibold text-slate-800">
        {{ direction }} <span class="font-normal text-slate-400">({{ degrees }}°)</span>
      </p>
      <p class="text-[11px] text-slate-500">
        <template v-if="label">{{ label }}</template>
        <template v-if="label && distanceKm !== null"> · </template>
        <template v-if="distanceKm !== null">{{ distanceKm.toFixed(2) }} km</template>
      </p>
    </div>
  </div>
</template>
