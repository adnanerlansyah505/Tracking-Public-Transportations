import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Reason an admin gives when rejecting a driver-submitted route request. */
export class RejectRouteDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
