<script setup lang="ts">
const route = useRoute();
const auth = useAuthStore();

const displayName = computed(
  () => auth.user?.profile?.fullName || auth.user?.username || auth.user?.email || 'My account',
);

const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0)).join('').toUpperCase() || 'AK';
});

const roleLabel = computed(() =>
  auth.user?.role ? `${auth.user.role.charAt(0).toUpperCase()}${auth.user.role.slice(1)} dashboard` : 'Dashboard',
);

const accountMenuItems = computed(() => [
  [
    { label: roleLabel.value, icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
    { label: 'Profile', icon: 'i-lucide-user-round', to: '/dashboard/profile' },
  ],
  [
    { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut },
  ],
]);

async function signOut() {
  await auth.logout();
  await navigateTo('/');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
    <!-- Main Top Navigation -->
    <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- Logo & Brand -->
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="flex items-center gap-2.5 transition opacity-90 hover:opacity-100">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white font-black text-base shadow-md shadow-blue-700/20">
              <img src="@/assets/images/logo-white.png"></img>
            </div>
            <div>
              <span class="font-bold tracking-tight text-slate-900 text-base">AngkotTracker</span>
            </div>
          </NuxtLink>

          <!-- Desktop Quick Links -->
          <div class="hidden md:flex items-center gap-1 text-xs font-medium text-slate-600">
            <NuxtLink
              to="/"
              class="rounded-lg px-3 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
              :class="route.path === '/' ? 'bg-slate-100 font-semibold text-blue-700' : ''"
            >
              Peta Live
            </NuxtLink>
          </div>
        </div>

        <!-- Right Action: account menu when signed in, otherwise sign-in CTA -->
        <div class="flex items-center gap-3">
          <UDropdownMenu
            v-if="auth.isAuthenticated"
            :items="accountMenuItems"
          >
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            >
              <span class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-700 text-[10px] font-bold text-white">
                <img
                  v-if="auth.user?.profile?.photo"
                  :src="auth.user.profile.photo"
                  :alt="displayName"
                  class="h-full w-full object-cover"
                >
                <template v-else>{{ initials }}</template>
              </span>

              <span class="hidden max-w-[140px] truncate sm:block">{{ displayName }}</span>

              <UIcon
                name="i-lucide-chevron-down"
                class="h-3.5 w-3.5 text-slate-400"
              />
            </button>
          </UDropdownMenu>

          <NuxtLink
            v-else
            to="/login"
            class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            Masuk / Pengemudi
          </NuxtLink>
        </div>
      </nav>
    </header>

    <!-- Page Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white text-slate-600 text-xs py-8">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800">AngkotTracker Bandung</span>
          <span class="text-slate-400">·</span>
          <span>Sistem Informasi Trayek & Angkutan Perkotaan</span>
        </div>
        <p class="text-slate-500 text-[11px]">
          Data koordinat trayek.
        </p>
      </div>
    </footer>
  </div>
</template>
