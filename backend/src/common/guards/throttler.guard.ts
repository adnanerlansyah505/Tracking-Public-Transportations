import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TooManyRequestsException } from '../exceptions/too-many-requests';

@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new TooManyRequestsException();
  }
}