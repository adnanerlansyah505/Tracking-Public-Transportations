import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class RegisterDTO {
    @IsNotEmpty({
    })
    @IsString({
    })
    @MinLength(2, {
    })
    fullName!: string;

    @IsNotEmpty({
    })
    @IsEmail(
        {},
    )
    email!: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    username!: string;

    @IsNotEmpty({
    })
    @MinLength(8, {
    })
    password!: string;

    @IsNotEmpty({
    })
    confirmPassword!: string;

    @IsNotEmpty({
    })
    @MinLength(2, {
    })
    city!: string;

    @IsNotEmpty({
    })
    @MinLength(2, {
        message: "Country must contain at least 2 characters"
    })
    country!: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^[+0-9][0-9\-\s]{5,30}$/, { message: 'Phone number is invalid' })
    phone!: string;

    @IsDateString(
        {},
        {
        message: 'Birth date must use YYYY-MM-DD format',
        },
    )
    birthDate!: string;

    @IsEnum(['male', 'female'], {
        message: 'Gender must be either male or female',
    })
    gender!: string;
}
