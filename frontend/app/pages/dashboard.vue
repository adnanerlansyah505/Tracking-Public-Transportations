<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
});

const authStore = useAuthStore();

const displayName = computed(() => authStore.user?.profile?.fullName || authStore.user?.username || authStore.user?.email || 'Traveler');
const roleLabel = computed(() => authStore.user?.role ? `${authStore.user.role.charAt(0).toUpperCase()}${authStore.user.role.slice(1)}` : 'User');
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-medium text-[#123d8d]">{{ roleLabel }} dashboard</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">Welcome back, {{ displayName }}</h1>
      <!-- <p class="mt-2 text-sm text-slate-500">{{ authStore.user?.email }}</p> -->
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Account</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{{ roleLabel }}</p>
        <p class="mt-1 text-sm capitalize text-slate-500">{{ authStore.user?.status || 'Unknown' }}</p>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Location</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{{ authStore.user?.profile?.city || 'Not set' }}</p>
        <p class="mt-1 text-sm text-slate-500">{{ authStore.user?.profile?.country || 'Add your country' }}</p>
      </section>

      <section v-if="authStore.user?.role === 'driver'" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{{ authStore.user.driverDetails?.vehiclePlateNumber || 'Not available' }}</p>
        <p class="mt-1 text-sm text-slate-500">{{ authStore.user.driverDetails?.startRoute || '—' }} → {{ authStore.user.driverDetails?.endRoute || '—' }}</p>
      </section>
    </div>
  </div>
</template>
