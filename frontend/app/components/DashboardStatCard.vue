<script setup lang="ts">
type Tone = 'brand' | 'amber' | 'emerald' | 'rose' | 'slate';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon?: string;
    caption?: string;
    tone?: Tone;
  }>(),
  {
    icon: 'i-lucide-activity',
    tone: 'brand',
  },
);

const TONE_CLASSES: Record<Tone, string> = {
  brand: 'bg-[#eef4ff] text-[#123d8d]',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
};
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <p class="text-xs font-medium text-slate-500">{{ props.label }}</p>
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        :class="TONE_CLASSES[props.tone]"
      >
        <UIcon
          :name="props.icon"
          class="h-4 w-4"
        />
      </span>
    </div>

    <p class="mt-3 text-2xl font-bold text-slate-900">
      {{ props.value }}
    </p>

    <p
      v-if="props.caption"
      class="mt-1 text-xs text-slate-400"
    >
      {{ props.caption }}
    </p>
  </section>
</template>
