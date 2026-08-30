<script setup lang="ts">
definePageMeta({ layout: 'dashboard' });

const authStore = useAuthStore();
</script>

<template>
  <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
    <p class="text-sm font-medium text-primary">Dashboard</p>
    <h1 class="mt-2 text-3xl font-bold text-slate-900">Welcome, {{ authStore.user?.email || 'Traveler' }}</h1>
    <p class="mt-3 text-slate-600">Your authenticated Nuxt app is connected to the backend API.</p>
  </div>
</template>
