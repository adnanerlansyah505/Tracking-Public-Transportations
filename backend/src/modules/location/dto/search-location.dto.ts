import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Where a passenger is standing while looking for an angkot. */
export class SearchLocationDTO {
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude!: number;

  /**
   * Opaque id the browser keeps for visitors who are not signed in, so their
   * search can be matched by a driver and repeat searches stay one request.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;
}
