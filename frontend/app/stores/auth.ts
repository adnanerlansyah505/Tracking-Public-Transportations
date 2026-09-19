import { defineStore } from 'pinia';

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  city: string;
  country?: string | null;
  bio?: string | null;
  phone?: string | null;
  photo?: string | null;
  address?: string | null;
  gender?: 'male' | 'female' | null;
  birthDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverDetails {
  id: string;
  userId?: string;
  identityCardNumber: string;
  vehiclePlateNumber: string;
  routeCode?: string | null;
  vehicleManufactureYear: number;
  startRoute: string;
  endRoute: string;
  passengerCapacity: number;
  registrationDocument?: string | null;
  operationPermit?: string | null;
  vehiclePhoto?: string | null;
  activatedAt?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: string;
  status?: string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  username?: string | null;
  profile?: Profile | null;
  driverDetails?: DriverDetails | null;
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

  // Non-secret marker that a session cookie may exist. The refresh token itself
  // is HttpOnly, so this is how the client knows whether asking the refresh
  // endpoint is worthwhile instead of firing a guaranteed 401.
  const sessionHint = useCookie<boolean>('auth_session', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: !import.meta.dev,
  });

  const user = ref<User | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  let initPromise: Promise<void> | null = null;
  let mePromise: Promise<User | null> | null = null;

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const token = computed(() => accessToken.value);

  function setSession(session: AuthSession) {
    accessToken.value = session.accessToken;
    user.value = session.user;
    sessionHint.value = true;
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    sessionHint.value = false;
  }

  function isUnauthorized(error: unknown): boolean {
    const candidate = error as {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
    } | null;

    return (candidate?.response?.status ?? candidate?.status ?? candidate?.statusCode) === 401;
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

  async function loginDriver(payload: { identifier: string; password: string }) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<AuthSession>>('/auth/login/driver', {
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

    // De-duplicate: the middleware, the layout and the profile page can all ask
    // for the current user during the same boot.
    if (!mePromise) {
      mePromise = (async () => {
        const { $api } = useNuxtApp();
        const response = await $api<ApiResponse<User>>('/auth/me');
        user.value = response.data ?? null;
        return user.value;
      })().finally(() => {
        mePromise = null;
      });
    }

    return mePromise;
  }

  /**
   * Update the signed-in user's profile. Sends JSON for text-only edits and
   * multipart when a new photo is attached.
   */
  async function updateProfile(payload: Record<string, unknown>, photo?: File | null) {
    const { $api } = useNuxtApp();

    let body: Record<string, unknown> | FormData = payload;

    if (photo) {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      }
      form.append('photo', photo);
      body = form;
    }

    const response = await $api<ApiResponse<Profile>>('/profile', {
      method: 'PATCH',
      body,
    });

    if (user.value && response.data) {
      user.value = { ...user.value, profile: response.data };
    }

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

  /**
   * Restore the session once on app boot. Idempotent and de-duplicated so the
   * middleware and the app shell can both await it without racing the
   * single-use refresh token.
   *
   * It only talks to the API when there is a real sign of a session — an access
   * token, or the hint left by a previous login. Without that, an anonymous
   * visit to a protected route would POST /auth/refresh with no cookie and get
   * a guaranteed "Refresh token is required" 401.
   */
  async function initialize(options?: { force?: boolean }) {
    if (initialized.value && !options?.force) return;

    if (!initPromise) {
      initPromise = (async () => {
        try {
          if (!user.value && accessToken.value) {
            // The access token may still be valid; /auth/me transparently falls
            // back to the refresh endpoint if it has expired.
            await fetchMe();
          } else if (!user.value && sessionHint.value) {
            await refreshSession();
          }
        } catch (error) {
          // A rejected refresh means the session is gone — stop retrying it.
          if (isUnauthorized(error)) clearSession();
        } finally {
          initialized.value = true;
        }
      })().finally(() => {
        initPromise = null;
      });
    }

    return initPromise;
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

  function loginWithGoogle(role: 'passenger' | 'driver' = 'passenger') {
    const runtimeConfig = useRuntimeConfig();
    const query = role === 'driver' ? '?role=driver' : '';
    window.location.href = `${runtimeConfig.public.apiBaseUrl}/auth/google${query}`;
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
    sessionHint,
    user,
    loading,
    initialized,
    isAuthenticated,
    token,
    setSession,
    clearSession,
    initialize,
    loginWithEmail,
    login,
    loginDriver,
    register,
    registerPassenger,
    registerDriver,
    fetchMe,
    updateProfile,
    refreshSession,
    logout,
    loginWithGoogle,
    hydrateFromToken,
  };
});
