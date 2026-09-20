<script setup lang="ts">
import type { ManagedRoute, RoutePayload } from '~/data/transitData';

definePageMeta({ layout: 'dashboard', roles: ['admin'] });

const currentRoute = useRoute();
const routesStore = useRoutesStore();
const { message } = useApiError();
const toast = useToast();

const id = computed(() => String(currentRoute.params.id));

const record = ref<ManagedRoute | null>(null);
const initial = ref<Partial<RoutePayload> | undefined>(undefined);
const loading = ref(true);
const submitting = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const route = await routesStore.fetchDetail(id.value);
    record.value = route;
    initial.value = {
      code: route.code,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      fare: route.fare,
      operatingHours: route.operatingHours,
      color: route.color,
      maxCapacity: route.maxCapacity,
      stops: route.stops.map((stop) => ({
        name: stop.name,
        zone: stop.zone,
        latitude: stop.coordinates[1],
        longitude: stop.coordinates[0],
      })),
    };
  } catch (cause) {
    error.value = message(cause, 'We could not load this route.');
  } finally {
    loading.value = false;
  }
});

async function onSubmit(payload: RoutePayload) {
  submitting.value = true;
  error.value = '';

  try {
    await routesStore.updateRoute(id.value, payload);
    toast.add({
      title: 'Route updated',
      description: `${payload.code} saved.`,
      color: 'success',
    });
    await navigateTo(`/dashboard/routes/${id.value}`);
  } catch (cause) {
    error.value = message(cause, 'We could not update this route.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div>
      <UButton
        :to="`/dashboard/routes/${id}`"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="xs"
      >
        Back to route
      </UButton>

      <h1 class="mt-2 text-2xl font-bold text-slate-900">
        Edit route
      </h1>
      <p
        v-if="record"
        class="mt-1 text-sm text-slate-500"
      >
        {{ record.code }} · {{ record.name }}
      </p>
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      Loading route…
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <RouteForm
      v-else-if="initial"
      :initial="initial"
      :submitting="submitting"
      submit-label="Save changes"
      mode="admin"
      @submit="onSubmit"
    />
  </div>
</template>
