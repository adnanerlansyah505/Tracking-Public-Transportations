import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt?: string;
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

interface NotificationFeed {
  notifications: AppNotification[];
  unread: number;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** How many notifications a page holds; the bell asks for the next on demand. */
const PAGE_SIZE = 10;

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const unread = ref(0);
  const connected = ref(false);
  const loading = ref(false);
  const loadingMore = ref(false);
  const total = ref(0);
  const hasMore = ref(false);
  // Rows already taken from the server, which is not always items.length —
  // duplicates dropped while appending don't advance the server's offset.
  const loaded = ref(0);

  // The newest live notification, so the app shell can surface a toast.
  const latest = ref<AppNotification | null>(null);

  let socket: Socket | null = null;
  let connectedToken: string | null = null;

  function socketUrl() {
    const { public: { apiBaseUrl } } = useRuntimeConfig();
    return String(apiBaseUrl).replace(/\/api\/v1\/?$/, '');
  }

  function connect(token: string) {
    if (!import.meta.client || !token) return;
    if (socket && connectedToken === token) return;

    disconnect();

    connectedToken = token;
    socket = io(socketUrl(), {
      auth: { token },
      withCredentials: true,
    });

    socket.on('connect', () => {
      connected.value = true;
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    socket.on('notification', (payload: AppNotification) => {
      if (!payload?.id) return;

      items.value = [payload, ...items.value.filter((item) => item.id !== payload.id)];
      unread.value += 1;
      total.value += 1;
      latest.value = payload;
    });
  }

  function disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }

    socket = null;
    connectedToken = null;
    connected.value = false;
  }

  /** Load the newest page, replacing the list. */
  async function fetch() {
    const { $api } = useNuxtApp();
    loading.value = true;

    try {
      const response = await $api<ApiResponse<NotificationFeed>>('/notifications', {
        query: { limit: PAGE_SIZE, offset: 0 },
      });

      const page = Array.isArray(response.data?.notifications) ? response.data.notifications : [];

      items.value = page;
      loaded.value = page.length;
      unread.value = response.data?.unread ?? 0;
      total.value = response.data?.total ?? page.length;
      hasMore.value = response.data?.hasMore ?? false;
    } finally {
      loading.value = false;
    }
  }

  /** Append the next page — driven by the bell's "load more" button. */
  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return;

    const { $api } = useNuxtApp();
    loadingMore.value = true;

    try {
      const response = await $api<ApiResponse<NotificationFeed>>('/notifications', {
        query: { limit: PAGE_SIZE, offset: loaded.value },
      });

      const page = Array.isArray(response.data?.notifications) ? response.data.notifications : [];
      const known = new Set(items.value.map((item) => item.id));

      // A live notification shifts every row down while the page is in flight,
      // so a row can arrive twice — the first copy wins.
      items.value = [...items.value, ...page.filter((item) => !known.has(item.id))];
      loaded.value += page.length;
      unread.value = response.data?.unread ?? unread.value;
      total.value = response.data?.total ?? total.value;
      hasMore.value = response.data?.hasMore ?? false;
    } finally {
      loadingMore.value = false;
    }
  }

  async function markRead(id: string) {
    const { $api } = useNuxtApp();
    await $api(`/notifications/${id}/read`, { method: 'PATCH' });

    const item = items.value.find((entry) => entry.id === id);
    if (item && !item.readAt) {
      item.readAt = new Date().toISOString();
      unread.value = Math.max(0, unread.value - 1);
    }
  }

  async function markAllRead() {
    const { $api } = useNuxtApp();
    await $api('/notifications/read-all', { method: 'PATCH' });

    const now = new Date().toISOString();
    items.value = items.value.map((item) => ({ ...item, readAt: item.readAt ?? now }));
    unread.value = 0;
  }

  /** Clear one notification. Available to every role — the API scopes it to you. */
  async function remove(id: string) {
    const { $api } = useNuxtApp();

    const response = await $api<ApiResponse<{ id: string; unread: number }>>(`/notifications/${id}`, {
      method: 'DELETE',
    });

    const removed = items.value.find((item) => item.id === id);

    items.value = items.value.filter((item) => item.id !== id);
    total.value = Math.max(0, total.value - 1);
    // The server has one row less before the offset, so keep the cursor aligned.
    loaded.value = Math.max(0, loaded.value - 1);
    unread.value = response.data?.unread
      ?? (removed?.readAt ? unread.value : Math.max(0, unread.value - 1));
  }

  function reset() {
    disconnect();
    items.value = [];
    unread.value = 0;
    total.value = 0;
    hasMore.value = false;
    loaded.value = 0;
    loadingMore.value = false;
    latest.value = null;
  }

  return {
    items,
    unread,
    connected,
    loading,
    loadingMore,
    total,
    hasMore,
    latest,
    connect,
    disconnect,
    fetch,
    loadMore,
    markRead,
    markAllRead,
    remove,
    reset,
  };
});
