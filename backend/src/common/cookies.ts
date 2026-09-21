import type { CookieOptions } from 'express';

/**
 * Cookie policy for browser <-> API requests.
 *
 * Locally the frontend and the API are both `localhost`, so cookies are
 * first-party and `SameSite=Lax` is enough. In a deployment the frontend can
 * live on a different site (a separate `*.vercel.app` host is its own site
 * according to the public suffix list), and cross-site requests only carry
 * cookies marked `SameSite=None` - which browsers in turn only accept together
 * with `Secure`.
 *
 * Both flags follow the configured `FRONTEND_URL`, so a deployment behaves the
 * same no matter how `NODE_ENV` is set, and a plain-HTTP frontend is never
 * handed a `Secure` cookie the browser would drop.
 *
 * Override with `COOKIE_SAMESITE=lax|none|strict`.
 */
export function cookieFlags(): Pick<CookieOptions, 'sameSite' | 'secure'> {
  const secure = isHttps(frontendOrigin());
  const configured = process.env.COOKIE_SAMESITE?.toLowerCase();

  const sameSite =
    configured === 'lax' || configured === 'none' || configured === 'strict'
      ? configured
      : secure ? 'none' : 'lax';

  // A `SameSite=None` cookie is rejected without `Secure`.
  return { sameSite, secure: secure || sameSite === 'none' };
}

function frontendOrigin(): string | undefined {
  const [origin] = (process.env.FRONTEND_URL ?? '').split(',');

  return origin?.trim().replace(/\/+$/, '') || undefined;
}

function isHttps(origin?: string): boolean {
  try {
    return new URL(origin ?? '').protocol === 'https:';
  } catch {
    return false;
  }
}
