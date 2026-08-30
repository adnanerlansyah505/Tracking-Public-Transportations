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
  profile?: {
    id: string;
    fullName: string;
    city: string;
    country?: string | null;
    phone?: string | null;
    photo?: string | null;
    address?: string | null;
    gender?: 'male' | 'female' | null;
    birthDate: string;
  } | null;
  driverDetails?: {
    id: string;
    identityCardNumber: string;
    vehiclePlateNumber: string;
    routeCode?: string | null;
    vehicleManufactureYear: number;
    startRoute: string;
    endRoute: string;
    passengerCapacity: number;
    activatedAt?: string | null;
  } | null;
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

  async function login(payload: { identifier: string; password: string }, loginType: string = 'passenger') {
    const { $api } = useNuxtApp();
    const path = loginType == 'passenger' ? '/auth/login' : '/auth/login/driver';
    const response = await $api<ApiResponse<AuthSession>>(path, {
      method: 'POST',
      body: payload,
    });
    setSession(response.data);
    return response.data;
  }

  async function registerPassenger(payload: Record<string, unknown>) {
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

  async function registerDriver(payload: FormData) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<unknown>>('/auth/register/driver', {
      method: 'POST',
      body: payload,
    });
    return response.data;
  }

  // Kept for existing passenger registration callers.
  const register = registerPassenger;

  // Backwards-compatible alias for existing passenger email forms.
  async function loginWithEmail(payload: { email: string; password: string }) {
    return login({ identifier: payload.email, password: payload.password });
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
    login,
    register,
    registerPassenger,
    registerDriver,
    fetchMe,
    refreshSession,
    logout,
    loginWithGoogle,
    hydrateFromToken,
  };
});
