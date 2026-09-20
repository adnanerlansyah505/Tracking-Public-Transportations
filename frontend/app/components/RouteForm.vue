<script setup lang="ts">
import type { RoutePayload, RouteStopInput } from '~/data/transitData';

const props = withDefaults(
  defineProps<{
    initial?: Partial<RoutePayload>;
    submitting?: boolean;
    submitLabel?: string;
    mode?: 'admin' | 'driver';
  }>(),
  {
    submitting: false,
    submitLabel: 'Save route',
    mode: 'admin',
  },
);

const emit = defineEmits<{ (e: 'submit', payload: RoutePayload): void }>();

const COLOR_OPTIONS = [
  { label: 'Emerald', value: '#059669' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Brand blue', value: '#123d8d' },
  { label: 'Rose', value: '#e11d48' },
];

const form = reactive({
  code: props.initial?.code ?? '',
  name: props.initial?.name ?? '',
  origin: props.initial?.origin ?? '',
  destination: props.initial?.destination ?? '',
  city: props.initial?.city ?? 'Bandung',
  fare: props.initial?.fare ?? '',
  operatingHours: props.initial?.operatingHours ?? '',
  color: props.initial?.color ?? '#123d8d',
  maxCapacity: props.initial?.maxCapacity ?? 12,
  stops: (props.initial?.stops?.map((stop) => ({ ...stop })) ?? [
    { name: '', zone: 'Central', latitude: 0, longitude: 0 },
    { name: '', zone: 'Central', latitude: 0, longitude: 0 },
  ]) as RouteStopInput[],
});

const error = ref('');

const { items: cityItems, ensure: ensureCities } = useSupportedCities();

onMounted(() => {
  ensureCities();
});

function validate(): string {
  const required: Array<[string | number, string]> = [
    [form.code, 'Route code'],
    [form.name, 'Route name'],
    [form.origin, 'Origin'],
    [form.destination, 'Destination'],
    [form.city, 'City'],
    [form.fare, 'Fare per-destination'],
    [form.operatingHours, 'Operating hours'],
  ];

  for (const [value, label] of required) {
    if (!String(value).trim()) return `${label} is required.`;
  }

  const capacity = Number(form.maxCapacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return 'Maximum capacity must be a whole number between 1 and 500.';
  }

  if (form.stops.length < 2) {
    return 'Add at least two stops to build the travel path.';
  }

  for (const [index, stop] of form.stops.entries()) {
    if (!String(stop.name).trim()) return `Stop ${index + 1} needs a name.`;

    const latitude = Number(stop.latitude);
    const longitude = Number(stop.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return `Stop ${index + 1} latitude must be between -90 and 90.`;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return `Stop ${index + 1} longitude must be between -180 and 180.`;
    }
  }

  return '';
}

function onSubmit() {
  const validationError = validate();

  if (validationError) {
    error.value = validationError;
    return;
  }

  error.value = '';

  emit('submit', {
    code: form.code.trim(),
    name: form.name.trim(),
    origin: form.origin.trim(),
    destination: form.destination.trim(),
    city: form.city.trim(),
    fare: form.fare.trim(),
    operatingHours: form.operatingHours.trim(),
    color: form.color,
    maxCapacity: Number(form.maxCapacity),
    stops: form.stops.map((stop) => ({
      name: String(stop.name).trim(),
      zone: String(stop.zone).trim(),
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    })),
  });
}
</script>

<template>
  <form
    class="space-y-5"
    @submit.prevent="onSubmit"
  >
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-900">
        Route details
      </h3>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <UFormField label="Route code">
          <UInput
            v-model="form.code"
            placeholder="e.g. 01A"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Route name">
          <UInput
            v-model="form.name"
            placeholder="e.g. Cicaheum - Ledeng"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Origin">
          <UInput
            v-model="form.origin"
            placeholder="e.g. Terminal Cicaheum"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Destination">
          <UInput
            v-model="form.destination"
            placeholder="e.g. Terminal Ledeng"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="City"
          help="The city this route belongs to. The map switches to it automatically when a visitor is there."
        >
          <USelect
            v-model="form.city"
            :items="cityItems"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Fare">
          <UInput
            v-model="form.fare"
            placeholder="e.g. Rp 6.000"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Operating hours">
          <UInput
            v-model="form.operatingHours"
            placeholder="e.g. 05:00 - 21:00"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Maximum capacity">
          <UInput
            v-model="form.maxCapacity"
            type="number"
            min="1"
            max="500"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Route color">
          <USelect
            v-model="form.color"
            :items="COLOR_OPTIONS"
            class="w-full"
          />
        </UFormField>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <RoutePathBuilder v-model="form.stops" />
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <UAlert
      v-if="mode === 'driver'"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Admin review required"
      description="Your route is submitted as a request. It appears on the public network once an admin approves it."
    />

    <div class="flex justify-end gap-3">
      <UButton
        type="submit"
        color="primary"
        size="lg"
        :loading="props.submitting"
        icon="i-lucide-check"
      >
        {{ props.submitLabel }}
      </UButton>
    </div>
  </form>
</template>
