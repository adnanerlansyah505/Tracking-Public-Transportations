import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RouteStopDTO } from './route-stop.dto';

/** Payload for an admin-created route or a driver-submitted route request. */
export class CreateRouteDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  code!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  origin!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  destination!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  fare!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  operatingHours!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'color must be a hex color such as #123d8d',
  })
  color?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  maxCapacity!: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RouteStopDTO)
  stops!: RouteStopDTO[];
}
