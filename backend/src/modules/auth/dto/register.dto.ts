import { IsDateString, IsEmail, IsEnum, IsIn, IsNotEmpty, IsString, MinLength, Validate } from "class-validator";
import { MatchConstraint } from "../../../common/validators/match.validator";

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