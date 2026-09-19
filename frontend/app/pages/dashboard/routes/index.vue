<script setup lang="ts">
import type { ManagedRoute, RouteStatus } from '~/data/transitData';

definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver', 'passenger'] });

const auth = useAuthStore();
const routesStore = useRoutesStore();
const { message } = useApiError();
const toast = useToast();

const role = computed(() => auth.user?.role ?? 'passenger');

const search = ref('');
const statusFilter = ref<'all' | RouteStatus>('all');
const loading = ref(true);
const error = ref('');
const guideOpen = ref(false);

const STATUS_FILTERS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Approved', value: 'approved' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

const columns = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Route' },
  { id: 'corridor', header: 'Corridor' },
  { accessorKey: 'maxCapacity', header: 'Capacity' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: '' },
];

const list = computed(() => (role.value === 'driver' ? routesStore.myRequests : routesStore.routes));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    if (role.value === 'admin') {
      await routesStore.fetchRoutes({
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        search: search.value,
        limit: 100,
      });
    } else if (role.value === 'driver') {
      await routesStore.fetchMine();
    } else {
      await routesStore.fetchRoutes({ search: search.value, limit: 100 });
    }
  } catch (cause) {
    error.value = message(cause, 'We could not load routes.');
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
});

watch(statusFilter, load);

onMounted(load);

const routePendingDeletion = ref<ManagedRoute | null>(null);
const deleting = ref(false);

function requestDelete(route: ManagedRoute) {
  routePendingDeletion.value = route;
}

async function confirmDelete() {
  const route = routePendingDeletion.value;
  if (!route) return;

  deleting.value = true;
  try {
    await routesStore.removeRoute(route.id);
    toast.add({ title: 'Route deleted', description: `${route.code} was removed.`, color: 'success' });
    routePendingDeletion.value = null;
  } catch (cause) {
    toast.add({ title: 'Delete failed', description: message(cause, 'We could not delete this route.'), color: 'error' });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          {{ role === 'admin' ? 'Routes' : role === 'driver' ? 'My route requests' : 'Browse routes' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ role === 'admin'
            ? 'Create and maintain the routes passengers can track.'
            : role === 'driver'
              ? 'Submit a route for admin review and track its decision.'
              : 'Every approved route on the Bandung network.' }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          v-if="role === 'driver'"
          icon="i-lucide-circle-help"
          color="neutral"
          variant="soft"
          @click="guideOpen = true"
          size="md"
        >
          How to submit
        </UButton>

        <UButton
          v-if="role === 'admin' || role === 'driver'"
          to="/dashboard/routes/new"
          icon="i-lucide-plus"
          color="primary"
          size="md"
          :ui="{
            base: 'text-white'
          }"
        >
          {{ role === 'admin' ? 'Add route' : 'Submit route request' }}
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="role === 'admin' ? 'Search code, name, or corridor…' : 'Search approved routes…'"
        class="w-full sm:w-80"
      />

      <USelect
        v-if="role === 'admin'"
        v-model="statusFilter"
        :items="STATUS_FILTERS"
        class="w-full sm:w-44"
      />
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      Loading routes…
    </div>

    <template v-else>
      <!-- Admin: full table -->
      <section
        v-if="role === 'admin'"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <UTable
          :data="list"
          :columns="columns"
        >
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-8 text-slate-500">
              <UIcon
                name="i-lucide-map"
                class="h-6 w-6"
              />
              <p class="text-sm">
                No routes match your filters.
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

          <template #maxCapacity-cell="{ row }">
            <span class="text-sm text-slate-700">{{ row.original.maxCapacity }}</span>
          </template>

          <template #status-cell="{ row }">
            <RouteStatusBadge :status="row.original.status" />
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UButton
                :to="`/dashboard/routes/${row.original.id}`"
                icon="i-lucide-eye"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="View route"
              />
              <UButton
                :to="`/dashboard/routes/edit/${row.original.id}`"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Edit route"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                aria-label="Delete route"
                @click="requestDelete(row.original)"
              />
            </div>
          </template>
        </UTable>
      </section>

      <!-- Driver: own submissions -->
      <section
        v-else-if="role === 'driver'"
        class="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <p
          v-if="list.length === 0"
          class="p-6 text-sm text-slate-500"
        >
          You haven't proposed a route yet.
          <NuxtLink
            to="/dashboard/routes/new"
            class="font-medium text-[#123d8d]"
          >
            Submit a route request
          </NuxtLink>.
        </p>

        <ul
          v-else
          class="divide-y divide-slate-100"
        >
          <li
            v-for="route in list"
            :key="route.id"
            class="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="`/dashboard/routes/${route.id}`"
                class="text-sm font-semibold text-slate-800 hover:text-[#123d8d]"
              >
                {{ route.code }} · {{ route.name }}
              </NuxtLink>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ route.origin }} → {{ route.destination }} · {{ route.stops.length }} stops
              </p>
              <p
                v-if="route.rejectionReason"
                class="mt-1 text-xs text-rose-600"
              >
                Reason: {{ route.rejectionReason }}
              </p>
            </div>

            <RouteStatusBadge :status="route.status" />
          </li>
        </ul>
      </section>

      <!-- Passenger: browse grid -->
      <section v-else>
        <p
          v-if="list.length === 0"
          class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm"
        >
          No approved routes match your search.
          <button
            v-if="search"
            type="button"
            class="font-medium text-[#123d8d]"
            @click="search = ''"
          >
            Clear search
          </button>
        </p>

        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <NuxtLink
            v-for="route in list"
            :key="route.id"
            :to="`/dashboard/routes/${route.id}`"
            class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div class="flex items-center justify-between">
              <span
                class="flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-black text-white"
                :style="{ backgroundColor: route.color }"
              >
                {{ route.code }}
              </span>
              <span class="text-xs font-semibold text-[#123d8d]">{{ route.fare }}</span>
            </div>

            <p class="mt-2 truncate text-sm font-semibold text-slate-800">{{ route.name }}</p>
            <p class="mt-1 truncate text-xs text-slate-500">{{ route.origin }} → {{ route.destination }}</p>

            <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
              <span>{{ route.stops.length }} stops</span>
              <span>{{ route.operatingHours }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>

    <UModal
      :open="Boolean(routePendingDeletion)"
      title="Delete route"
      @update:open="(value: boolean) => { if (!value) routePendingDeletion = null; }"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Delete <strong>{{ routePendingDeletion?.code }} · {{ routePendingDeletion?.name }}</strong>?
          Passengers will no longer see it on the network.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="routePendingDeletion = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          >
            Delete route
          </UButton>
        </div>
      </template>
    </UModal>

    <RouteRequestGuide v-model:open="guideOpen" />
  </div>
</template>
