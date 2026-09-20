import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  /**
   * Carry the intended account role through the OAuth round-trip in `state`.
   * Passport's default NullStore never validates a string state, so the value
   * reaches the callback untouched and lets us create a driver account when the
   * sign-in started from the Driver tab.
   */
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const role = request.query?.role === 'driver' ? 'driver' : 'passenger';

    return { state: role };
  }
}
