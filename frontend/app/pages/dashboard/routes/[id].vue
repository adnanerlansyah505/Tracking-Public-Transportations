<script setup lang="ts">
import type { ManagedRoute } from '~/data/transitData';

definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver', 'passenger'] });

const currentRoute = useRoute();
const auth = useAuthStore();
const routesStore = useRoutesStore();
const { message } = useApiError();
const toast = useToast();

const id = computed(() => String(currentRoute.params.id));
const role = computed(() => auth.user?.role ?? 'passenger');

const record = ref<ManagedRoute | null>(null);
const loading = ref(true);
const error = ref('');
const acting = ref(false);

const rejectOpen = ref(false);
const rejectReason = ref('');

const isPending = computed(() => record.value?.status === 'pending');

async function load() {
  loading.value = true;
  error.value = '';

  try {
    record.value = await routesStore.fetchDetail(id.value);
  } catch (cause) {
    error.value = message(cause, 'We could not load this route.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function approve() {
  if (!record.value) return;

  acting.value = true;
  try {
    record.value = await routesStore.approveRequest(record.value.id);
    toast.add({
      title: 'Route approved',
      description: 'It is now visible to passengers.',
      color: 'success',
    });
  } catch (cause) {
    toast.add({
      title: 'Approval failed',
      description: message(cause, 'We could not approve this route.'),
      color: 'error',
    });
  } finally {
    acting.value = false;
  }
}

async function reject() {
  if (!record.value) return;

  if (!rejectReason.value.trim()) {
    toast.add({ title: 'Add a reason', description: 'Explain why the request is rejected.', color: 'warning' });
    return;
  }

  acting.value = true;
  try {
    record.value = await routesStore.rejectRequest(record.value.id, rejectReason.value.trim());
    toast.add({ title: 'Route rejected', color: 'success' });
    rejectOpen.value = false;
    rejectReason.value = '';
  } catch (cause) {
    toast.add({
      title: 'Rejection failed',
      description: message(cause, 'We could not reject this route.'),
      color: 'error',
    });
  } finally {
    acting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <UButton
      to="/dashboard/routes"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      size="xs"
    >
      Back to routes
    </UButton>

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

    <template v-else-if="record">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <span
            class="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-black text-white"
            :style="{ backgroundColor: record.color }"
          >
            {{ record.code }}
          </span>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">{{ record.name }}</h1>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ record.origin }} → {{ record.destination }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <RouteStatusBadge :status="record.status" />

          <template v-if="role === 'admin' && isPending">
            <UButton
              color="success"
              icon="i-lucide-check"
              :loading="acting"
              @click="approve"
            >
              Approve
            </UButton>
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :disabled="acting"
              @click="rejectOpen = true"
            >
              Reject
            </UButton>
          </template>

          <UButton
            v-if="role === 'admin' && !isPending"
            :to="`/dashboard/routes/edit/${record.id}`"
            color="neutral"
            variant="soft"
            icon="i-lucide-pencil"
          >
            Edit
          </UButton>
        </div>
      </div>

      <UAlert
        v-if="record.status === 'rejected' && record.rejectionReason"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-x"
        title="Request rejected"
        :description="record.rejectionReason"
      />

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <MapboxMap
            :routes="[record]"
            :active-route-id="record.id"
            :is-simulating="false"
            map-height="420px"
          />
        </div>

        <dl class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Fare
            </dt>
            <dd class="mt-0.5 text-sm font-semibold text-slate-900">
              {{ record.fare }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Operating hours
            </dt>
            <dd class="mt-0.5 text-sm font-semibold text-slate-900">
              {{ record.operatingHours }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Maximum capacity
            </dt>
            <dd class="mt-0.5 text-sm font-semibold text-slate-900">
              {{ record.maxCapacity }} passengers
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Stops
            </dt>
            <dd class="mt-0.5 text-sm font-semibold text-slate-900">
              {{ record.stops.length }} on the corridor
            </dd>
          </div>
        </dl>
      </div>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-slate-900">
          Stops in order
        </h2>

        <div class="relative mt-4 space-y-4 pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          <div
            v-for="(stop, index) in record.stops"
            :key="stop.id"
            class="relative flex items-center justify-between gap-3"
          >
            <span
              class="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white"
              :style="{ backgroundColor: index === 0 || index === record.stops.length - 1 ? record.color : '#94a3b8' }"
            />
            <div>
              <p class="text-sm font-medium text-slate-800">
                {{ stop.name }}
              </p>
              <p class="text-xs text-slate-400">
                {{ stop.zone }} · {{ stop.coordinates[1].toFixed(4) }}, {{ stop.coordinates[0].toFixed(4) }}
              </p>
            </div>
            <span
              v-if="index === 0"
              class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
            >
              Origin
            </span>
            <span
              v-else-if="index === record.stops.length - 1"
              class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
            >
              Destination
            </span>
          </div>
        </div>
      </section>

      <UModal
        v-model:open="rejectOpen"
        title="Reject route request"
      >
        <template #body>
          <p class="text-sm text-slate-600">
            Tell the driver why this route can't be approved. They will see your reason.
          </p>
          <UTextarea
            v-model="rejectReason"
            class="mt-3 w-full"
            :rows="3"
            placeholder="e.g. This corridor overlaps an existing route."
          />
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="rejectOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="acting"
              @click="reject"
            >
              Reject request
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
