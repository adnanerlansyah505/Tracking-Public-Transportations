import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

/** A single ordered stop supplied when creating or requesting a route. */
export class RouteStopDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  zone!: string;

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
}
