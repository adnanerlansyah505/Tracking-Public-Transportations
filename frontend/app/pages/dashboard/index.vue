<script setup lang="ts">
definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver', 'passenger'] });

const auth = useAuthStore();
const routesStore = useRoutesStore();
const { message } = useApiError();

const role = computed(() => auth.user?.role ?? 'passenger');
const displayName = computed(
  () => auth.user?.profile?.fullName || auth.user?.username || auth.user?.email || 'Traveler',
);
const roleLabel = computed(() => role.value.charAt(0).toUpperCase() + role.value.slice(1));

const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    if (role.value === 'admin') {
      await Promise.all([
        routesStore.fetchStats(),
        routesStore.fetchRequests({ limit: 5 }),
      ]);
    } else if (role.value === 'driver') {
      await routesStore.fetchMine();
    } else {
      await routesStore.fetchRoutes({ limit: 100 });
    }
  } catch (cause) {
    error.value = message(cause, 'We could not load your dashboard.');
  } finally {
    loading.value = false;
  }
});

const stats = computed(() => routesStore.stats);
const myRequests = computed(() => routesStore.myRequests);
const approvedRoutes = computed(() => routesStore.routes);
const pendingPreview = computed(() => routesStore.pendingRequests.slice(0, 5));

const driverCounts = computed(() => ({
  total: myRequests.value.length,
  pending: myRequests.value.filter((route) => route.status === 'pending').length,
  approved: myRequests.value.filter((route) => route.status === 'approved').length,
  rejected: myRequests.value.filter((route) => route.status === 'rejected').length,
}));

const totalStops = computed(() =>
  approvedRoutes.value.reduce((sum, route) => sum + (route.stops?.length ?? 0), 0),
);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-[#123d8d]">{{ roleLabel }} dashboard</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">Welcome back, {{ displayName }}</h1>
      </div>

      <UButton
        v-if="role === 'driver'"
        to="/dashboard/routes/new"
        icon="i-lucide-plus"
        color="primary"
        :ui="{
          base: 'text-white'
        }"
      >
        Submit route request
      </UButton>

      <UButton
        v-if="role === 'admin'"
        to="/dashboard/routes/new"
        icon="i-lucide-plus"
        color="primary"
      >
        Add route
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <div
      v-if="role === 'driver' && !auth.user?.driverDetails"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-triangle-alert"
          class="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
        />
        <div>
          <p class="text-sm font-semibold text-amber-900">
            Vehicle information required
          </p>
          <p class="mt-0.5 text-xs text-amber-800">
            Add your vehicle and operation details so your profile is complete and an admin can review it.
          </p>
        </div>
      </div>

      <UButton
        to="/dashboard/profile"
        color="warning"
        size="sm"
        icon="i-lucide-pencil"
      >
        Add details
      </UButton>
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      Loading your overview…
    </div>

    <template v-else>
      <!-- Admin -->
      <template v-if="role === 'admin'">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardStatCard
            label="Total routes"
            :value="stats?.totalRoutes ?? 0"
            icon="i-lucide-map"
            tone="brand"
          />
          <DashboardStatCard
            label="Approved"
            :value="stats?.approvedRoutes ?? 0"
            icon="i-lucide-circle-check"
            tone="emerald"
          />
          <DashboardStatCard
            label="Pending requests"
            :value="stats?.pendingRequests ?? 0"
            icon="i-lucide-inbox"
            tone="amber"
            caption="Awaiting review"
          />
          <DashboardStatCard
            label="Rejected"
            :value="stats?.rejectedRequests ?? 0"
            icon="i-lucide-circle-x"
            tone="rose"
          />
          <DashboardStatCard
            label="Drivers"
            :value="stats?.totalDrivers ?? 0"
            icon="i-lucide-steering-wheel"
            tone="slate"
          />
          <DashboardStatCard
            label="Passengers"
            :value="stats?.totalPassengers ?? 0"
            icon="i-lucide-users"
            tone="slate"
          />
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Latest route requests</h2>
            <UButton
              to="/dashboard/route-requests"
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              Review queue
            </UButton>
          </div>

          <p
            v-if="pendingPreview.length === 0"
            class="mt-4 text-sm text-slate-500"
          >
            No pending requests. Driver submissions will appear here.
          </p>

          <ul
            v-else
            class="mt-3 divide-y divide-slate-100"
          >
            <li
              v-for="route in pendingPreview"
              :key="route.id"
              class="flex items-center justify-between gap-3 py-2.5"
            >
              <div class="min-w-0">
                <NuxtLink
                  :to="`/dashboard/routes/${route.id}`"
                  class="truncate text-sm font-medium text-slate-800 hover:text-[#123d8d]"
                >
                  {{ route.code }} · {{ route.name }}
                </NuxtLink>
                <p class="truncate text-xs text-slate-500">
                  {{ route.origin }} → {{ route.destination }}
                </p>
              </div>
              <RouteStatusBadge :status="route.status" />
            </li>
          </ul>
        </section>
      </template>

      <!-- Driver -->
      <template v-else-if="role === 'driver'">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label="My submissions"
            :value="driverCounts.total"
            icon="i-lucide-file-text"
            tone="brand"
          />
          <DashboardStatCard
            label="Pending"
            :value="driverCounts.pending"
            icon="i-lucide-clock"
            tone="amber"
          />
          <DashboardStatCard
            label="Approved"
            :value="driverCounts.approved"
            icon="i-lucide-circle-check"
            tone="emerald"
          />
          <DashboardStatCard
            label="Rejected"
            :value="driverCounts.rejected"
            icon="i-lucide-circle-x"
            tone="rose"
          />
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Recent submissions</h2>
            <UButton
              to="/dashboard/routes"
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              View all
            </UButton>
          </div>

          <p
            v-if="myRequests.length === 0"
            class="mt-4 text-sm text-slate-500"
          >
            You haven't proposed a route yet.
            <NuxtLink
              to="/dashboard/routes/new"
              class="font-medium text-[#123d8d]"
            >
              Submit your first request
            </NuxtLink>.
          </p>

          <ul
            v-else
            class="mt-3 divide-y divide-slate-100"
          >
            <li
              v-for="route in myRequests.slice(0, 5)"
              :key="route.id"
              class="flex items-center justify-between gap-3 py-2.5"
            >
              <div class="min-w-0">
                <NuxtLink
                  :to="`/dashboard/routes/${route.id}`"
                  class="truncate text-sm font-medium text-slate-800 hover:text-[#123d8d]"
                >
                  {{ route.code }} · {{ route.name }}
                </NuxtLink>
                <p
                  v-if="route.rejectionReason"
                  class="truncate text-xs text-rose-600"
                >
                  {{ route.rejectionReason }}
                </p>
              </div>
              <RouteStatusBadge :status="route.status" />
            </li>
          </ul>
        </section>
      </template>

      <!-- Passenger -->
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2">
          <DashboardStatCard
            label="Available routes"
            :value="approvedRoutes.length"
            icon="i-lucide-map"
            tone="brand"
          />
          <DashboardStatCard
            label="Stops across the network"
            :value="totalStops"
            icon="i-lucide-map-pin"
            tone="slate"
          />
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Browse routes</h2>
            <UButton
              to="/dashboard/routes"
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              See all routes
            </UButton>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NuxtLink
              v-for="route in approvedRoutes.slice(0, 6)"
              :key="route.id"
              :to="`/dashboard/routes/${route.id}`"
              class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div class="flex items-center gap-2">
                <span
                  class="flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-black text-white"
                  :style="{ backgroundColor: route.color }"
                >
                  {{ route.code }}
                </span>
                <span class="truncate text-sm font-semibold text-slate-800">{{ route.name }}</span>
              </div>
              <p class="mt-2 truncate text-xs text-slate-500">
                {{ route.origin }} → {{ route.destination }}
              </p>
              <p class="mt-1 text-xs font-medium text-[#123d8d]">{{ route.fare }}</p>
            </NuxtLink>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
