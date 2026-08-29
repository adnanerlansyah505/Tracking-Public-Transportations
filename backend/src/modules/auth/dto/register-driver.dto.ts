import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { RegisterDTO } from './register.dto';

/** Submitted after the driver registration form's vehicle-information step. */
export class RegisterDriverDTO extends RegisterDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  identityCardNumber!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  vehiclePlateNumber!: string;

  @IsOptional()
  @IsString()
  routeCode?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  vehicleManufactureYear!: number;

  @IsNotEmpty()
  @IsString()
  startRoute!: string;

  @IsNotEmpty()
  @IsString()
  endRoute!: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  passengerCapacity!: number;

}
