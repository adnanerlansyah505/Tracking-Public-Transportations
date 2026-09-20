<script setup lang="ts">
import type { ManagedRoute } from '~/data/transitData';

definePageMeta({ layout: 'dashboard', roles: ['admin'] });

const routesStore = useRoutesStore();
const { message } = useApiError();
const toast = useToast();

const loading = ref(true);
const error = ref('');
const actingId = ref<string | null>(null);

const columns = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Route' },
  { id: 'corridor', header: 'Corridor' },
  { id: 'stops', header: 'Stops' },
  { id: 'actions', header: '' },
];

const requests = computed(() => routesStore.pendingRequests);

async function load() {
  loading.value = true;
  error.value = '';

  try {
    await routesStore.fetchRequests({ limit: 100 });
  } catch (cause) {
    error.value = message(cause, 'We could not load route requests.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function approve(route: ManagedRoute) {
  actingId.value = route.id;
  try {
    await routesStore.approveRequest(route.id);
    toast.add({
      title: 'Route approved',
      description: `${route.code} is now visible to passengers.`,
      color: 'success',
    });
    await load();
  } catch (cause) {
    toast.add({
      title: 'Approval failed',
      description: message(cause, 'We could not approve this request.'),
      color: 'error',
    });
  } finally {
    actingId.value = null;
  }
}

const rejectOpen = ref(false);
const rejectTarget = ref<ManagedRoute | null>(null);
const rejectReason = ref('');

function openReject(route: ManagedRoute) {
  rejectTarget.value = route;
  rejectReason.value = '';
  rejectOpen.value = true;
}

async function reject() {
  const route = rejectTarget.value;
  if (!route) return;

  if (!rejectReason.value.trim()) {
    toast.add({ title: 'Add a reason', description: 'Explain why the request is rejected.', color: 'warning' });
    return;
  }

  actingId.value = route.id;
  try {
    await routesStore.rejectRequest(route.id, rejectReason.value.trim());
    toast.add({ title: 'Route rejected', description: `${route.code} was sent back to the driver.`, color: 'success' });
    rejectOpen.value = false;
    await load();
  } catch (cause) {
    toast.add({
      title: 'Rejection failed',
      description: message(cause, 'We could not reject this request.'),
      color: 'error',
    });
  } finally {
    actingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-medium text-[#123d8d]">Review</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Route requests
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Driver-submitted routes waiting for a decision. Approving publishes the route to passengers.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      Loading requests…
    </div>

    <section
      v-else
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <UTable
        :data="requests"
        :columns="columns"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-8 text-slate-500">
            <UIcon
              name="i-lucide-inbox"
              class="h-6 w-6"
            />
            <p class="text-sm">
              No pending requests. Driver submissions will appear here.
            </p>
          </div>
        </template>

        <template #code-cell="{ row }">
          <span
            class="flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-black text-white"
            :style="{ backgroundColor: row.original.color }"
          >
            {{ row.original.code }}
          </span>
        </template>

        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/dashboard/routes/${row.original.id}`"
            class="text-sm font-medium text-slate-800 hover:text-[#123d8d]"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>

        <template #corridor-cell="{ row }">
          <span class="text-xs text-slate-500">
            {{ row.original.origin }} → {{ row.original.destination }}
          </span>
        </template>

        <template #stops-cell="{ row }">
          <span class="text-sm text-slate-700">{{ row.original.stops.length }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <UButton
              color="success"
              size="xs"
              icon="i-lucide-check"
              :loading="actingId === row.original.id"
              @click="approve(row.original)"
            >
              Approve
            </UButton>
            <UButton
              color="error"
              variant="soft"
              size="xs"
              icon="i-lucide-x"
              :disabled="actingId === row.original.id"
              @click="openReject(row.original)"
            >
              Reject
            </UButton>
          </div>
        </template>
      </UTable>
    </section>

    <UModal
      v-model:open="rejectOpen"
      title="Reject route request"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Rejecting <strong>{{ rejectTarget?.code }} · {{ rejectTarget?.name }}</strong>. The driver will see your reason.
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
            :loading="actingId === rejectTarget?.id"
            @click="reject"
          >
            Reject request
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
