<script setup lang="ts">
const auth = useAuthStore();
async function signOut() {
  await auth.logout();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/dashboard" class="font-bold text-primary-700">AngkotTracker</NuxtLink>
        <div class="flex items-center gap-4">
          <span class="hidden text-sm text-slate-600 sm:block">{{ auth.user?.email }}</span>
          <UButton color="neutral" variant="ghost" size="sm" @click="signOut">Sign out</UButton>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl p-6 sm:p-8"><slot /></main>
  </div>
</template>
