import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Vehicle details a driver maintains on their own profile. */
export class UpsertDriverDetailsDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  identityCardNumber!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  vehiclePlateNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  routeCode?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  vehicleManufactureYear!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  startRoute!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  endRoute!: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  passengerCapacity!: number;
}
