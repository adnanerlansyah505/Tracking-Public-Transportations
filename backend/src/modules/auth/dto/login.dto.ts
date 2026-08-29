import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDTO {

    @IsNotEmpty({
    })
    @IsString()
    identifier!: string;

    @IsNotEmpty({
    })
    @MinLength(8, {
    })
    password!: string;

}
