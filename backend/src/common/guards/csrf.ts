import { doubleCsrf } from 'csrf-csrf';

export const {
  generateCsrfToken: generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => {
    const secret = process.env.CSRF_SECRET;

    if (!secret) {
      throw new Error('CSRF_SECRET is not configured');
    }

    return secret;
  },

  getSessionIdentifier: (req) => {
    return (req as any).csrfSessionId;
  },

  cookieName: 'csrf-token',

  cookieOptions: {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },

  size: 64,

  ignoredMethods: [
    'GET',
    'HEAD',
    'OPTIONS',
  ],

  getCsrfTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] as string;
  },
  
  errorConfig: {
    statusCode: 403,
    message: 'Invalid CSRF token.',
    code: 'csrf_invalid',
  },
});