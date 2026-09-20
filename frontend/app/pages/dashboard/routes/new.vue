<script setup lang="ts">
import type { RoutePayload } from '~/data/transitData';

definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver'] });

const auth = useAuthStore();
const routesStore = useRoutesStore();
const { message } = useApiError();
const toast = useToast();

const role = computed(() => auth.user?.role ?? 'passenger');
const submitting = ref(false);
const error = ref('');
const guideOpen = ref(false);

async function onSubmit(payload: RoutePayload) {
  submitting.value = true;
  error.value = '';

  try {
    if (role.value === 'admin') {
      await routesStore.createRoute(payload);
      toast.add({
        title: 'Route created',
        description: `${payload.code} is live on the network.`,
        color: 'success',
      });
    } else {
      await routesStore.submitRequest(payload);
      toast.add({
        title: 'Request submitted',
        description: 'An admin will review your route before it goes live.',
        color: 'success',
      });
    }

    await navigateTo('/dashboard/routes');
  } catch (cause) {
    error.value = message(cause, 'We could not save this route.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <UButton
          to="/dashboard/routes"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="xs"
          :ui="{
            base: 'text-black'
          }"
        >
          Back to routes
        </UButton>

        <h1 class="mt-2 text-2xl font-bold text-slate-900">
          {{ role === 'admin' ? 'Add a route' : 'Submit a route request' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ role === 'admin'
            ? 'Publish a new route to the passenger network.'
            : 'Describe the corridor you want to operate. An admin reviews every request.' }}
        </p>
      </div>

      <UButton
        v-if="role === 'driver'"
        icon="i-lucide-circle-help"
        color="neutral"
        variant="solid"
        @click="guideOpen = true"
      >
        How to submit
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <RouteForm
      :mode="role === 'driver' ? 'driver' : 'admin'"
      :submitting="submitting"
      :submit-label="role === 'admin' ? 'Create route' : 'Submit for review'"
      @submit="onSubmit"
    />

    <RouteRequestGuide v-model:open="guideOpen" />
  </div>
</template>
