<script setup lang="ts">
import type { AppNotification } from '~/stores/notifications';

const auth = useAuthStore();
const notifications = useNotificationsStore();
const router = useRouter();

const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function iconFor(type: string) {
  if (type.startsWith('route_request')) return 'i-lucide-map';
  if (type.startsWith('driver_request')) return 'i-lucide-steering-wheel';
  if (type.startsWith('driver_registered')) return 'i-lucide-user-plus';
  if (type.startsWith('passenger_search')) return 'i-lucide-users';
  if (type.startsWith('nearby_angkot')) return 'i-lucide-navigation';
  if (type.startsWith('driver_online')) return 'i-lucide-radio-tower';
  return 'i-lucide-bell';
}

function linkFor(item: AppNotification): string | null {
  const routeId = typeof item.data?.routeId === 'string' ? item.data.routeId : null;

  if (item.type === 'route_request.created') return '/dashboard/route-requests';
  if (item.type === 'driver_request.created') return '/dashboard/driver-requests';
  if (item.type.startsWith('route_request')) {
    return routeId ? `/dashboard/routes/${routeId}` : '/dashboard/routes';
  }
  if (item.type.startsWith('driver_request')) return '/dashboard/profile';
  if (item.type === 'driver_registered') return '/dashboard';
  if (item.type.startsWith('passenger_search')) return '/';
  if (item.type.startsWith('nearby_angkot')) return '/';
  if (item.type.startsWith('driver_online')) return '/';

  return null;
}

function timeAgo(value?: string | null) {
  if (!value) return '';

  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return `${Math.floor(hours / 24)} hari lalu`;
}

async function openItem(item: AppNotification) {
  close();

  if (!item.readAt) {
    try {
      await notifications.markRead(item.id);
    } catch {
      // Reading a notification is best-effort.
    }
  }

  const link = linkFor(item);
  if (link) await router.push(link);
}

async function markAll() {
  try {
    await notifications.markAllRead();
  } catch {
    // Best-effort.
  }
}

async function loadMore() {
  try {
    await notifications.loadMore();
  } catch {
    // The next tap can retry.
  }
}

async function dismiss(item: AppNotification) {
  try {
    await notifications.remove(item.id);
  } catch {
    // Best-effort: the row stays if the API refuses.
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) {
    close();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close();
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});

const roleLabel = computed(() => auth.user?.role ?? '');
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <UButton
      icon="i-lucide-bell"
      color="neutral"
      variant="ghost"
      class="relative"
      :aria-label="`Notifikasi${roleLabel ? ` (${roleLabel})` : ''}`"
      :ui="{ base: 'text-black hover:text-white' }"
      @click="toggle"
    />

    <span
      v-if="notifications.unread > 0"
      class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
    >
      {{ notifications.unread > 9 ? '9+' : notifications.unread }}
    </span>

    <div
      v-if="isOpen"
      class="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p class="text-xs font-semibold text-slate-900">
          Notifikasi
        </p>

        <button
          v-if="notifications.unread > 0"
          type="button"
          class="cursor-pointer text-xs font-semibold text-[#123d8d] hover:underline"
          @click="markAll"
        >
          Tandai semua dibaca
        </button>
      </header>

      <div class="max-h-[320px] overflow-y-auto">
        <p
          v-if="notifications.loading && notifications.items.length === 0"
          class="p-6 text-center text-xs text-slate-400"
        >
          Memuat…
        </p>

        <p
          v-else-if="notifications.items.length === 0"
          class="p-6 text-center text-xs text-slate-400"
        >
          Belum ada notifikasi.
        </p>

        <div
          v-for="item in notifications.items"
          :key="item.id"
          class="flex items-stretch border-b border-slate-50 transition last:border-0"
          :class="item.readAt ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 p-3 text-left"
            @click="openItem(item)"
          >
            <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#123d8d]">
              <UIcon
                :name="iconFor(item.type)"
                class="h-3.5 w-3.5"
              />
            </span>

            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-slate-800">{{ item.title }}</span>
              <span
                v-if="item.body"
                class="mt-0.5 block text-[11px] leading-snug text-slate-500"
              >
                {{ item.body }}
              </span>
              <span class="mt-1 block text-[10px] text-slate-400">{{ timeAgo(item.createdAt) }}</span>
            </span>

            <span
              v-if="!item.readAt"
              class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            class="mr-1.5 flex w-7 cursor-pointer items-center justify-center text-slate-300 transition hover:text-rose-600"
            :title="'Hapus notifikasi'"
            :aria-label="`Hapus notifikasi: ${item.title}`"
            @click="dismiss(item)"
          >
            <UIcon
              name="i-lucide-x"
              class="h-3.5 w-3.5"
            />
          </button>
        </div>
      </div>

      <!-- Lazy-loading: the next page is only fetched when asked for. -->
      <button
        v-if="notifications.hasMore"
        type="button"
        class="w-full cursor-pointer border-t border-slate-100 p-2.5 text-xs font-semibold text-[#123d8d] transition hover:bg-slate-50 disabled:cursor-default disabled:text-slate-400"
        :disabled="notifications.loadingMore"
        @click="loadMore"
      >
        {{ notifications.loadingMore
          ? 'Memuat…'
          : `Muat lebih banyak (${Math.max(0, notifications.total - notifications.items.length)} lagi)` }}
      </button>
    </div>
  </div>
</template>
