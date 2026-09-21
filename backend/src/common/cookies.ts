/**
 * Cookie policy for browser <-> API requests.
 *
 * Locally the frontend and the API are both `localhost`, so cookies are
 * first-party and `SameSite=Lax` is enough. On Vercel they live on separate
 * `*.vercel.app` hosts, which the public suffix list treats as different sites -
 * and cross-site requests only carry cookies marked `SameSite=None`.
 *
 * `SameSite=None` requires `Secure`, which the call sites already tie to
 * `NODE_ENV === 'production'`. Override with `COOKIE_SAMESITE=lax` when the
 * frontend and the API are served from one site.
 */
export function cookieSameSite(): 'lax' | 'none' | 'strict' {
  const configured = process.env.COOKIE_SAMESITE?.toLowerCase();

  if (configured === 'lax' || configured === 'none' || configured === 'strict') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}
