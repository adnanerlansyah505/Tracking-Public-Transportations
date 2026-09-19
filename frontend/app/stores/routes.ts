import { defineStore } from 'pinia';
import type { ManagedRoute, RoutePayload, RouteStats, RouteStatus } from '~/data/transitData';

interface ApiResponse<T> {
  status: boolean;
  data: T;
  message?: string;
}

interface RouteListResult {
  routes: ManagedRoute[];
  metadata: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ListParams {
  status?: RouteStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export const useRoutesStore = defineStore('routes', () => {
  const routes = ref<ManagedRoute[]>([]);
  const pendingRequests = ref<ManagedRoute[]>([]);
  const myRequests = ref<ManagedRoute[]>([]);
  const stats = ref<RouteStats | null>(null);
  const loading = ref(false);

  function buildQuery(params?: ListParams) {
    return {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      status: params?.status,
      search: params?.search || undefined,
    };
  }

  async function fetchRoutes(params?: ListParams) {
    const { $api } = useNuxtApp();
    loading.value = true;
    try {
      const response = await $api<ApiResponse<RouteListResult>>('/routes', {
        query: buildQuery(params),
      });
      routes.value = response.data.routes;
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  /** Public landing page: approved routes only, no session required. */
  async function fetchPublicRoutes(params?: ListParams) {
    const { $api } = useNuxtApp();
    loading.value = true;
    try {
      const response = await $api<ApiResponse<RouteListResult>>('/routes/public', {
        query: buildQuery(params),
      });
      routes.value = Array.isArray(response.data?.routes) ? response.data.routes : [];
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>(`/routes/${id}`);
    return response.data;
  }

  async function fetchRequests(params?: ListParams) {
    const { $api } = useNuxtApp();
    loading.value = true;
    try {
      const response = await $api<ApiResponse<RouteListResult>>('/routes/requests', {
        query: buildQuery({ limit: 100, ...params }),
      });
      pendingRequests.value = response.data.routes;
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMine(params?: ListParams) {
    const { $api } = useNuxtApp();
    loading.value = true;
    try {
      const response = await $api<ApiResponse<RouteListResult>>('/routes/mine', {
        query: buildQuery({ limit: 100, ...params }),
      });
      myRequests.value = response.data.routes;
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<RouteStats>>('/routes/stats');
    stats.value = response.data;
    return response.data;
  }

  async function createRoute(payload: RoutePayload) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>('/routes', {
      method: 'POST',
      body: payload,
    });
    return response.data;
  }

  async function updateRoute(id: string, payload: Partial<RoutePayload>) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>(`/routes/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    return response.data;
  }

  async function submitRequest(payload: RoutePayload) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>('/routes/requests', {
      method: 'POST',
      body: payload,
    });
    return response.data;
  }

  async function approveRequest(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>(`/routes/${id}/approve`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async function rejectRequest(id: string, reason: string) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<ManagedRoute>>(`/routes/${id}/reject`, {
      method: 'PATCH',
      body: { reason },
    });
    return response.data;
  }

  async function removeRoute(id: string) {
    const { $api } = useNuxtApp();
    await $api(`/routes/${id}`, { method: 'DELETE' });
    routes.value = routes.value.filter((route) => route.id !== id);
  }

  return {
    routes,
    pendingRequests,
    myRequests,
    stats,
    loading,
    fetchRoutes,
    fetchPublicRoutes,
    fetchDetail,
    fetchRequests,
    fetchMine,
    fetchStats,
    createRoute,
    updateRoute,
    submitRequest,
    approveRequest,
    rejectRequest,
    removeRoute,
  };
});
