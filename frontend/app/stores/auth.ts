import { defineStore } from 'pinia';

export interface User {
  id: string;
  email: string;
  role: string;
  status?: string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  username?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useCookie<string | null>('auth_token', {
    default: () => null,
    sameSite: 'lax',
    secure: !import.meta.dev,
  });

  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const token = computed(() => accessToken.value);

  function setSession(session: AuthSession) {
    accessToken.value = session.accessToken;
    user.value = session.user;
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
  }

  async function loginWithEmail(payload: { email: string; password: string }) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<AuthSession>>('/auth/login', {
      method: 'POST',
      body: payload,
    });
    setSession(response.data);
    return response.data;
  }

  async function register(payload: Record<string, unknown>) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<unknown>>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    return response.data;
  }

  async function fetchMe() {
    if (!accessToken.value) return null;

    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<User>>('/auth/me');
    user.value = response.data;
    return response.data;
  }

  async function refreshSession() {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<AuthSession>>('/auth/refresh', {
      method: 'POST',
    });
    setSession(response.data);
    return response.data;
  }

  async function logout() {
    const { $api } = useNuxtApp();
    try {
      await $api('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  }

  function loginWithGoogle() {
    const runtimeConfig = useRuntimeConfig();
    const googleUrl = `${runtimeConfig.public.apiBaseUrl}/auth/google`;
    window.location.href = googleUrl;
  }

  async function hydrateFromToken() {
    if (!accessToken.value) return null;

    try {
      return await fetchMe();
    } catch {
      clearSession();
      return null;
    }
  }

  return {
    accessToken,
    user,
    loading,
    isAuthenticated,
    token,
    setSession,
    clearSession,
    loginWithEmail,
    register,
    fetchMe,
    refreshSession,
    logout,
    loginWithGoogle,
    hydrateFromToken,
  };
});
