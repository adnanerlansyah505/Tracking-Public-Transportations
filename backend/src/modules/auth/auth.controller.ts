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

    @Public()
    @Post("login")
    async login(@Body() dto: LoginDTO, @Res({ passthrough: true }) res: Response) {
        const session = await this.authService.login(dto);
        this.setRefreshToken(res, session.refreshToken, session.refreshTokenExpiresAt);
        return this.accessSession(session);
    }

    @Public()
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const session = await this.authService.refreshSession(req.cookies?.refresh_token);
        this.setRefreshToken(res, session.refreshToken, session.refreshTokenExpiresAt);
        return this.accessSession(session);
    }

    @Public()
    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        await this.authService.logout(req.cookies?.refresh_token);
        res.clearCookie('refresh_token', { path: '/api/v1/auth' });
        return { message: 'Logged out successfully.' };
    }

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
        this.setRefreshToken(res, session.refreshToken, session.refreshTokenExpiresAt);
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4000';

        return res.redirect(`${frontendUrl}/login/google`);
    }

    @Get('me') me(@CurrentUser() user: { id: string }) { return this.authService.me(user.id); }

    @Public() @Post("verify-email") verifyEmail(@Query("token") token: string) { return this.authService.verifyEmail(token) };

    @Public() @Throttle({ default: { limit: 3, ttl: 60000 }}) @Post("resend-verification") resendVerification(
        @Body()
        dto: ResendVerificationDTO,
    ) {
        return this.authService.resendVerificationEmail(dto.email);
    }

    private accessSession(session: {
        accessToken: string;
        user: unknown;
        refreshToken: string;
        refreshTokenExpiresAt: Date;
    }) {
        return {
            accessToken: session.accessToken,
            user: session.user,
            // Kept in the HttpOnly cookie for normal browser use. This copy is
            // intentionally exposed only for clients that explicitly need it.
            refreshToken: session.refreshToken,
            refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        };
    }

    private setRefreshToken(res: Response, token: string, expires: Date) {
        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth',
            expires,
        });
    }

}
