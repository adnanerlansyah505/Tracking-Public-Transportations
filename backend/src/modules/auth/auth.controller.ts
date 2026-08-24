import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {

    constructor (private authService: AuthService) {}

    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Public() @Post("register") register(@Body() dto: RegisterDTO) { return this.authService.register(dto) }

    @Public() @Post("login") login(@Body() dto: LoginDTO) { return this.authService.login(dto) }

}