<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);

type UserRole = 'admin' | 'driver' | 'passenger';
type NavigationItem = {
  label: string;
  icon: string;
  to: string;
  roles: UserRole[];
};

const displayName = computed(() => auth.user?.profile?.fullName || auth.user?.username || auth.user?.email || 'Traveler');
const initials = computed(() => displayName.value.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase());
const roleLabel = computed(() => auth.user?.role ? `${auth.user.role.charAt(0).toUpperCase()}${auth.user.role.slice(1)}` : 'User');
const accountIdentifier = computed(() => auth.user?.driverDetails?.identityCardNumber || auth.user?.id || '—');

onMounted(async () => {
  if (!auth.user?.profile) {
    try {
      await auth.fetchMe();
    } catch {
      // The route middleware owns redirecting expired sessions.
    }
  }
});

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    roles: ['admin', 'driver', 'passenger'],
  },
  {
    label: 'My Routes',
    icon: 'i-lucide-map',
    to: '/dashboard/routes',
    roles: ['driver', 'passenger'],
  },
  {
    label: 'Profile',
    icon: 'i-lucide-user-round',
    to: '/dashboard/profile',
    roles: ['admin', 'driver', 'passenger'],
  },
];

const secondaryNavigationItems: NavigationItem[] = [
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    roles: ['admin'],
  },
  {
    label: 'Help',
    icon: 'i-lucide-circle-help',
    to: '/help',
    roles: ['admin', 'driver', 'passenger'],
  },
];

const currentRole = computed<UserRole | null>(() => {
  const role = auth.user?.role;
  return role === 'admin' || role === 'driver' || role === 'passenger' ? role : null;
});

const visibleNavigationItems = computed(() => currentRole.value
  ? navigationItems.filter((item) => item.roles.includes(currentRole.value!))
  : []);

const visibleSecondaryNavigationItems = computed(() => currentRole.value
  ? secondaryNavigationItems.filter((item) => item.roles.includes(currentRole.value!))
  : []);

const isActive = (path: string) => {
  return route.path === path;
};

function closeSidebar() {
  isSidebarOpen.value = false;
}

async function signOut() {
  await auth.logout();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#f5f7fa] text-slate-900">
    <div class="flex min-h-screen">
      <!-- ========================================== -->
      <!-- SIDEBAR -->
      <!-- ========================================== -->
      <button
        v-if="isSidebarOpen"
        class="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        aria-label="Close navigation menu"
        @click="closeSidebar"
      />
      <aside
        id="dashboard-sidebar"
        class="fixed inset-y-0 left-0 z-50 flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none"
        :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <!-- Account identity -->
        <div class="px-3 pt-3">
          <div class="px-2">
            <p class="text-[13px] font-semibold text-slate-900">
              {{ roleLabel }} Portal
            </p>

            <p class="mt-1 text-[11px] text-slate-400">
              ID: {{ accountIdentifier }}
            </p>
          </div>

          <!-- Driver card -->
          <div
            class="mt-3 rounded-lg bg-slate-100 px-2.5 py-2.5"
          >
            <div class="flex items-center gap-2">
              <!-- Avatar -->
              <div
                class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-200"
              >
                <img
                  v-if="auth.user?.profile?.photo"
                  :src="auth.user.profile?.photo"
                  :alt="displayName"
                  class="h-full w-full object-cover"
                />

                <span
                  v-else
                  class="text-xs font-semibold text-slate-500"
                >
                  {{ initials }}
                </span>

                <!-- Online indicator -->
                <!-- <span
                  class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                /> -->
              </div>

              <div class="min-w-0">
                <p
                  class="truncate text-xs font-medium text-slate-800"
                >
                  {{ displayName }}
                </p>

                <div
                  class="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-500"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />

                  <span>{{ auth.user?.status === 'active' ? 'Active' : auth.user?.status || 'Loading' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main navigation -->
        <nav class="mt-4 px-3">
          <div class="space-y-1">
            <NuxtLink
              v-for="item in visibleNavigationItems"
              :key="item.to"
              :to="item.to"
              @click="closeSidebar"
              class="flex h-[30px] items-center gap-3 rounded-md px-2.5 text-xs transition-colors"
              :class="
                isActive(item.to)
                  ? 'bg-[#203f96] font-medium text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              "
            >
              <UIcon
                :name="item.icon"
                class="h-4 w-4 shrink-0"
              />

              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
        </nav>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Start Shift -->
        <!-- <div class="px-3">
          <UButton
            block
            color="primary"
            class="h-[76px] rounded-md bg-[#062d82] text-xs font-semibold hover:bg-[#05266d]"
          >
            Start Shift
          </UButton>
        </div> -->

        <!-- Divider -->
        <div class="mx-3 my-4 border-t border-slate-200" />

        <!-- Secondary navigation -->
        <nav class="px-3 pb-4">
          <div class="space-y-1">
            <NuxtLink
              v-for="item in visibleSecondaryNavigationItems"
              :key="item.to"
              :to="item.to"
              @click="closeSidebar"
              class="flex h-[30px] items-center gap-3 rounded-md px-2.5 text-xs text-slate-700 transition-colors hover:bg-slate-100"
            >
              <UIcon
                :name="item.icon"
                class="h-4 w-4 shrink-0"
              />

              <span>{{ item.label }}</span>
            </NuxtLink>
            <NuxtLink
                color="neutral"
                variant="ghost"
                size="sm"
                class="flex md:hidden h-[30px] items-center gap-3 rounded-md px-2.5 text-xs text-slate-700 cursor-pointer transition-colors hover:bg-red-100"
                :ui="{
                  base: 'text-black hover:text-white'
                }"
                @click="signOut"
              >
                <UIcon
                  name="i-lucide-log-out"
                  class="h-4 w-4 shrink-0"
                />
                Sign out
              </NuxtLink>
          </div>
        </nav>
      </aside>

      <!-- ========================================== -->
      <!-- MAIN AREA -->
      <!-- ========================================== -->
      <div class="min-w-0 flex-1">
        <!-- TOP HEADER -->
        <header
          class="h-[72px] border-b border-slate-200 bg-white"
        >
          <div
            class="flex h-full items-center justify-between px-5 lg:px-7"
          >
            <!-- Left -->
            <div class="flex items-center gap-3">
              <!-- Mobile menu -->
              <UButton
                icon="i-lucide-menu"
                color="neutral"
                variant="ghost"
                class="lg:hidden"
                aria-label="Open navigation menu"
                aria-controls="dashboard-sidebar"
                :aria-expanded="isSidebarOpen"
                @click="isSidebarOpen = true"
                :ui="{
                  base: 'text-black hover:text-white'
                }"
              />

              <div>
                <p class="text-xs text-slate-400">
                  Welcome back
                </p>

                <p class="text-sm font-semibold text-slate-900">
                  {{ displayName }}
                </p>
              </div>
            </div>

            <!-- Right -->
            <div class="flex items-center gap-3">
              <!-- Notifications -->
              <UButton
                icon="i-lucide-bell"
                color="neutral"
                variant="ghost"
                class="relative"
                :ui="{
                  base: 'text-black hover:text-white'
                }"
              />

              <!-- User -->
              <div class="hidden items-center gap-2 sm:flex">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                >
                  {{ initials }}
                </div>

                <div class="hidden xl:block">
                  <p class="text-xs font-medium text-slate-800">
                    {{ displayName }}
                  </p>

                  <p class="text-[10px] text-slate-400">
                    {{ roleLabel }}
                  </p>
                </div>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="hidden sm:flex"
                :ui="{
                  base: 'text-black hover:text-white'
                }"
                @click="signOut"
              >
                Sign out
              </UButton>
            </div>
          </div>
        </header>

        <!-- ========================================== -->
        <!-- PAGE CONTENT -->
        <!-- ========================================== -->
        <main
          class="min-h-[calc(100vh-72px)] p-4 sm:p-5 lg:p-6"
        >
          <div class="mx-auto max-w-[1400px]">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
