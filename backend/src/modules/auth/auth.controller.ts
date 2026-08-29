import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from 'express';
import { AuthService } from "./auth.service";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";
import { ResendVerificationDTO } from "./dto/resend-verification.dto";
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@Controller("auth")
export class AuthController {

    constructor (private authService: AuthService) {}

    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Public() @Post("register") register(@Body() dto: RegisterDTO) { return this.authService.register(dto) }

    @Public() @Post("login") login(@Body() dto: LoginDTO) { return this.authService.login(dto) }

    @Public()
    @Get('google')
    @UseGuards(GoogleOAuthGuard)
    googleLogin() {
        return;
    }

    @Public()
    @Get('google/callback')
    @UseGuards(GoogleOAuthGuard)
    async googleCallback(@Req() req: Request, @Res() res: Response) {
        const session = await this.authService.loginWithGoogle((req as any).user);
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4000';

        return res.redirect(`${frontendUrl}/login/google?token=${encodeURIComponent(session.accessToken)}`);
    }

    @Get('me') me(@CurrentUser() user: { id: string }) { return this.authService.me(user.id); }

    @Public() @Post("verify-email") verifyEmail(@Query("token") token: string) { return this.authService.verifyEmail(token) };

    @Public() @Throttle({ default: { limit: 3, ttl: 60000 }}) @Post("resend-verification") resendVerification(
        @Body()
        dto: ResendVerificationDTO,
    ) {
        return this.authService.resendVerificationEmail(dto.email);
    }

}