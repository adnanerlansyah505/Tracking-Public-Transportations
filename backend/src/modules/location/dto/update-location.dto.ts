import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/** A driver's reported position while location sharing is on. */
export class UpdateLocationDTO {
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  speedKmh?: number;
}
