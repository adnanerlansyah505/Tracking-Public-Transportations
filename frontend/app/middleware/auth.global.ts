type UserRole = 'admin' | 'driver' | 'passenger';

/** Reachable by everyone, signed in or not. */
const PUBLIC_PATHS = new Set(['/', '/login/google', '/verify-email']);

/** Sign-in / sign-up pages a signed-in user should not see. */
const GUEST_ONLY_PATHS = new Set(['/login', '/register', '/register/driver']);

/**
 * Single authorization layer for the app.
 *
 * - Server: only a cheap cookie check, so SSR never calls the API (this also
 *   avoids blocking an anonymous hard-load of a protected page).
 * - Client: full enforcement — signed-in users are kept off guest-only pages,
 *   protected pages require a session, and pages declare their allowed roles
 *   with `definePageMeta({ roles: [...] })`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  const isPublic = PUBLIC_PATHS.has(to.path);
  const isGuestOnly = GUEST_ONLY_PATHS.has(to.path);

  if (import.meta.server) {
    if (!isPublic && !isGuestOnly && !auth.accessToken && !auth.sessionHint) {
      return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
    }
    return;
  }

  // Client: restore the session once, then enforce access.
  const isProtected = !isPublic && !isGuestOnly;
  await auth.initialize(isProtected ? { force: true } : undefined);

  // Guest-only pages: send signed-in users to their dashboard instead.
  if (isGuestOnly) {
    if (auth.isAuthenticated) {
      return navigateTo('/dashboard');
    }

    return;
  }

  if (isPublic) {
    return;
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }

  // Role gate: a page's `roles` meta lists who may open it.
  const requiredRoles = to.meta.roles as UserRole[] | undefined;

  if (requiredRoles?.length) {
    const role = auth.user?.role as UserRole | undefined;

    if (!role || !requiredRoles.includes(role)) {
      return navigateTo('/dashboard');
    }
  }
});

declare module '#app' {
  interface PageMeta {
    roles?: UserRole[];
  }
}
