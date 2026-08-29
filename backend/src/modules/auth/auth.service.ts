import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { DB } from "../../database/database.module";
import type { DbClient, DbTransaction } from "../../database/database.module";
import { UserRepository } from "../users/users.repository";
import { RegisterDTO } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';
import { LoginDTO } from "./dto/login.dto";
import { User } from "../../database/schema";
import { JwtService } from "@nestjs/jwt";
import { ProfileRepository } from "../profiles/profiles.repository";
import { createHash, randomBytes } from "node:crypto";
import { EmailService } from "../../common/email/email.service";
import { AuthRepository, type AuthTokenType } from "./auth.repository";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(DB) private db: DbClient,
        private userRepository: UserRepository,
        private profileRepository: ProfileRepository,
        private authRepository: AuthRepository,
        private jwtService: JwtService,
        private emailService: EmailService,
        private config: ConfigService,
    ) {}

    async register(dto: RegisterDTO) {
        const existing = await this.userRepository.findByEmail(dto.email, { withProfile: true });

        if (existing) throw new ConflictException('Email is already registered');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const result = await this.db.transaction(async (tx) => {
            const user = await this.userRepository.create(
                {
                    email: dto.email,
                    passwordHash,
                },
                tx,
            );

            const profile = await this.profileRepository.create({
                userId: user.id,
                fullName: dto.fullName,
                city: dto.city,
                country: dto.country,
                birthDate: dto.birthDate,
                gender: dto.gender as "male" | "female" | undefined,
            }, tx);

            const { token, expiresAt } = await this.createAuthToken(user.id, 'email_verification', 24 * 60 * 60 * 1000, tx);

            return {
                user,
                profile,
                token,
                expiresAt,
            };
        });

        await this.sendVerificationEmail(
            result.user,
            result.token,
            result.expiresAt,
        );

        return {
            message: "Registration account successfully.",
            status: true,
            data: {
                user: this.sanitizeUser(result.user),
                profile: result.profile,
            },
        };
    }

    async login(dto: LoginDTO) {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException("Invalid email or password")
        if (!user.emailVerifiedAt) throw new UnauthorizedException('Please verify your email address before logging in.');
        return this.createSession(user)
    }

    async me(identifier: string) {
        const user = await this.userRepository.find(identifier);
        if (!user) throw new UnauthorizedException("User is not found");
        return this.sanitizeUser(user);
    }

    async loginWithGoogle(profile: {
        email?: string;
        fullName?: string;
        avatar?: string;
        provider: string;
        providerId: string;
    }) {
        const email = profile.email;

        if (!email) {
            throw new UnauthorizedException('Google profile email is required.');
        }

        const existingUser = await this.userRepository.findByEmail(email, { withProfile: true });

        if (existingUser) {
            return this.createSession(existingUser);
        }

        const result = await this.db.transaction(async (tx) => {
            const user = await this.userRepository.create(
                {
                    email,
                    passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
                    emailVerifiedAt: new Date(),
                },
                tx,
            );

            await this.profileRepository.create(
                {
                    userId: user.id,
                    fullName: profile.fullName ?? 'Google User',
                    city: 'Not specified',
                    country: 'Not specified',
                    birthDate: new Date().toISOString().slice(0, 10),
                    photo: profile.avatar,
                    gender: undefined,
                },
                tx,
            );

            return user;
        });

        const user = await this.userRepository.findById(result.id, { withProfile: true });

        if (!user) {
            throw new UnauthorizedException('Unable to create Google user session.');
        }

        return this.createSession(user);
    }

    async refreshSession(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is required.');
        }

        const token = await this.authRepository.consumeValidTokenHash(
            this.hashToken(refreshToken),
            'refresh_token',
        );

        if (!token) {
            throw new UnauthorizedException('Refresh token is invalid or expired.');
        }

        const user = await this.userRepository.find(token.userId);
        if (!user) {
            throw new UnauthorizedException('User is not found.');
        }

        return this.createSession(user);
    }

    async logout(refreshToken?: string) {
        if (refreshToken) {
            await this.authRepository.consumeValidTokenHash(
                this.hashToken(refreshToken),
                'refresh_token',
            );
        }
    }

    async verifyEmail(token: string) {
        if (!token) throw new BadRequestException("Verification token is required");

        const authToken = await this.authRepository.findValidByTokenHash(this.hashToken(token), 'email_verification');

        if (!authToken) throw new BadRequestException("Invalid verification token.")

        const user = await this.userRepository.findById(authToken.userId, { withProfile: true });

        if (!user) {
            throw new BadRequestException("Invalid verification token.");
        }

        if (user.emailVerifiedAt) throw new BadRequestException({ code: "email_already_verified", message: "Email address is already verified" });

        await this.db.transaction(async (tx) => {
            await this.userRepository.update(
                user.id,
                {
                    emailVerifiedAt: new Date(),
                },
                tx,
            );

            await this.authRepository.markUsed(authToken.id, new Date(), tx);
        });

        return {
            status: true,
            message: 'Email address verified successfully.',
            data: {
                user: this.sanitizeUser({ ...user, emailVerifiedAt: new Date() })
            }
        };
    }

    async resendVerificationEmail(email: string) {
        const user = await this.userRepository.findByEmail(email, { withProfile: true });

        if (!user) throw new NotFoundException("Email is not exist, please enter a valid email.");

        if (user.emailVerifiedAt) throw new BadRequestException({ code: "email_already_verified", message: "Email address is already verified" });

        await this.db.transaction(async (tx) => {
            await this.authRepository.invalidateActiveTokensForUser(user.id, 'email_verification', tx);

            const { token, expiresAt } = await this.createAuthToken(user.id, 'email_verification', 24 * 60 * 60 * 1000, tx);
            await this.sendVerificationEmail(user, token, expiresAt);
        });

        return {
            status: true,
            message: "Verification email has been sent.",
            data: null,
        };
    }

    private async sendVerificationEmail(user: any, token: string, expiresAt: Date) {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4000';
        const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

        await this.emailService.sendVerificationEmail(user.email, { verificationUrl, recipientName: user.profile?.fullName, expiresIn: expiresAt })

        this.logger.log(`Verification email generated for ${user.email}`);
        this.logger.debug(`Verification URL: ${verificationUrl}`);
    }

    private async createAuthToken(
        userId: string,
        type: AuthTokenType,
        ttlMs: number,
        tx?: DbTransaction,
    ) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date(Date.now() + ttlMs);

        const authToken = await this.authRepository.create(
            {
                userId,
                type,
                tokenHash,
                expiresAt,
            },
            tx,
        );

        return {
            token,
            tokenHash,
            expiresAt,
            authToken,
        };
    }

    private async createSession(user: User) {
        const refreshTokenTtlDays = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS', '30'));
        const refreshTokenTtlMs = (Number.isFinite(refreshTokenTtlDays) && refreshTokenTtlDays > 0
            ? refreshTokenTtlDays
            : 30) * 24 * 60 * 60 * 1000;
        const refreshToken = await this.createAuthToken(
            user.id,
            'refresh_token',
            refreshTokenTtlMs,
        );

        return {
            accessToken: this.jwtService.sign({
                sub: user.id,
                email: user.email,
                role: user.role,
            }),
            user: this.sanitizeUser(user),
            refreshToken: refreshToken.token,
            refreshTokenExpiresAt: refreshToken.expiresAt,
        };
    }

    private sanitizeUser(user: User) {
        const {
            passwordHash,
            ...safeUser
        } = user;

        return safeUser;
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}
