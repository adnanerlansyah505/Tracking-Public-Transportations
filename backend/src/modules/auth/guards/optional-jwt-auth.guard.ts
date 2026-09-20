import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authenticates the request when a valid bearer token is present, but never
 * rejects it. Endpoints that must stay open to anonymous visitors while still
 * behaving differently for signed-in users use this instead of the global guard
 * (which skips passport entirely for `@Public()` routes).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_error: unknown, user: TUser): TUser {
    return user;
  }
}
