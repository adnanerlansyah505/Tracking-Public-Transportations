import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { cookieSameSite } from '../cookies';

export const CSRF_SESSION_COOKIE = 'csrf-session';

export function csrfSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let sessionId = req.cookies?.[CSRF_SESSION_COOKIE];

  if (!sessionId) {
    sessionId = randomUUID();

    res.cookie(
      CSRF_SESSION_COOKIE,
      sessionId,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: cookieSameSite(),
        path: '/',
      },
    );
  }

  // Make it available to csrf-csrf
  (req as any).csrfSessionId = sessionId;

  next();
}