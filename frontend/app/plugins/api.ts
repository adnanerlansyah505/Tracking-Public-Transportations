interface CsrfTokenResponse {
  status: boolean;
  data: {
    csrfToken: string;
  };
}

interface RefreshResponse {
  status: boolean;
  data: {
    accessToken: string;
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFRESH_PATH = '/auth/refresh';

/** API client for Nest's bearer-token and double-submit CSRF setup. */
export default defineNuxtPlugin((nuxtApp) => {
  const { apiBaseUrl } = useRuntimeConfig().public;
  let csrfToken: string | null = null;
  let csrfTokenRequest: Promise<string> | null = null;
  let refreshRequest: Promise<void> | null = null;

  const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    csrfTokenRequest ??= $fetch<CsrfTokenResponse>('/csrf/token', {
      baseURL: apiBaseUrl,
      credentials: 'include',
    })
      .then((response) => {
        csrfToken = response.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });

    return csrfTokenRequest;
  };

  const rawApi = $fetch.create({
    baseURL: apiBaseUrl,
    credentials: 'include',
    async onRequest({ options }) {
      const headers = new Headers(options.headers);
      const auth = useAuthStore(nuxtApp.$pinia);

      if (auth.accessToken) {
        headers.set('Authorization', `Bearer ${auth.accessToken}`);
      }

      const method = (options.method ?? 'GET').toUpperCase();
      if (!SAFE_METHODS.has(method)) {
        headers.set('X-CSRF-Token', await getCsrfToken());
      }

      options.headers = headers;
    },
  });

  const refreshAccessToken = async () => {
    refreshRequest ??= rawApi<RefreshResponse>(REFRESH_PATH, { method: 'POST' })
      .then((response) => {
        useAuthStore(nuxtApp.$pinia).accessToken = response.data.accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });

    return refreshRequest;
  };

  const api = async <T>(request: string, options?: Parameters<typeof rawApi>[1]): Promise<T> => {
    try {
      return await rawApi<T>(request, options);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 401 || request === REFRESH_PATH) {
        if (status === 401) useAuthStore(nuxtApp.$pinia).clearSession();
        throw error;
      }

      try {
        await refreshAccessToken();
        return await rawApi<T>(request, options);
      } catch (refreshError) {
        useAuthStore(nuxtApp.$pinia).clearSession();
        throw refreshError;
      }
    }
  };

  return {
    provide: {
      api,
      refreshAccessToken,
      refreshCsrfToken: async () => {
        csrfToken = null;
        return getCsrfToken();
      },
    },
  };
});
