import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Reason an admin gives when rejecting a driver's vehicle change request. */
export class RejectDriverRequestDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
