const PUBLIC_PATHS = new Set(['/', '/login', '/login/google', '/register', '/register/driver', '/verify-email']);

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_PATHS.has(to.path)) return;

  const auth = useAuthStore();

  if (!auth.accessToken || !auth.user) {
    try {
      // Restore the short-lived access token from the HttpOnly refresh cookie.
      await auth.refreshSession();
    } catch {
      return navigateTo('/login');
    }
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login');
  }
});
