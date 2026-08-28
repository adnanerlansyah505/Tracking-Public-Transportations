import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DB } from "../../database/database.module";
import type { DbClient } from "../../database/database.module";
import { UserRepository } from "../users/users.repository";
import { RegisterDTO } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';
import { LoginDTO } from "./dto/login.dto";
import { User } from "../../database/schema";
import { JwtService } from "@nestjs/jwt";
import { ProfileRepository } from "../profiles/profiles.repository";
import { createHash, randomBytes } from "node:crypto";
import { EmailService } from "../../common/email/email.service";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(DB) private db: DbClient,
        private userRepository: UserRepository,
        private profileRepository: ProfileRepository,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) {}

    async register(dto: RegisterDTO) {
        const existing = await this.userRepository.findByEmail(dto.email, { withProfile: true });
        
        if (existing) throw new ConflictException('Email is already registered');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const { token, tokenHash, expiresAt, } = this.generateVerificationToken();
                
        const result = await this.db.transaction(async (tx) => {
            const user = await this.userRepository.create(
                {
                    email: dto.email,
                    passwordHash,

                    verificationTokenHash: tokenHash,
                    verificationTokenExpiresAt: expiresAt
                },
                tx
            )

            const profile = await this.profileRepository.create({
                userId: user.id,
                fullName: dto.fullName,
                city: dto.city,
                country: dto.country,
                birthDate: dto.birthDate,
                gender: dto.gender as "male" | "female" | undefined,
            }, tx)

            return {
                user,
                profile
            }
        })
        
        await this.sendVerificationEmail(
            result.user,
            token,
            expiresAt
        );

        return {
            message: "Registration account successfully.",
            status: true,
            data: {
                user: this.sanitizeUser(result.user),
                profile: result.profile
            },
        }
    }    

    async login(dto: LoginDTO) {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException("Invalid email or password")
        if (!user.emailVerifiedAt) throw new UnauthorizedException('Please verify your email address before logging in.');
        return this.session(user)
    }

    async me(identifier: string) {
        const user = await this.userRepository.find(identifier);
        if (!user) throw new UnauthorizedException("User is not found");
        return this.sanitizeUser(user);
    }

    async verifyEmail(token: string) {
        if (!token) throw new BadRequestException("Verification token is required");

        const tokenHash = this.hashToken(token);

        const user = await this.userRepository.findByVerificationToken(tokenHash);

        if (!user) throw new BadRequestException("Invalid verification token.")
        
        if (user.emailVerifiedAt) throw new BadRequestException({ code: "email_already_verified", message: "Email address is already verified" });

        if (
            !user.verificationTokenExpiresAt ||
            user.verificationTokenExpiresAt <
            new Date()
        ) {
            throw new BadRequestException({
            code: 'verification_token_expired',
            message:
                'Verification token has expired.',
            });
        }

        // Mark email as verified
        const verifiedUser = await this.userRepository.update(
            user.id,
            {
                emailVerifiedAt: new Date(),

                verificationTokenHash: null,
                verificationTokenExpiresAt: null
            }
        )

        return {
            status: true,
            message:
            'Email address verified successfully.',
            data: {
                user: this.sanitizeUser(verifiedUser ?? user)
            }
        };

    }

    async resendVerificationEmail(email: string) {
        const user = await this.userRepository.findByEmail(email, { withProfile: true });

        if (!user) throw new NotFoundException("Email is not exist, please enter a valid email.");
        
        if (user.emailVerifiedAt) throw new BadRequestException({ code: "email_already_verified", message: "Email address is already verified" });

        const { token, tokenHash, expiresAt } = this.generateVerificationToken();

        await this.userRepository.update(
            user.id,
            {
                verificationTokenHash: tokenHash,
                verificationTokenExpiresAt: expiresAt,
            },
        );

        await this.sendVerificationEmail(
            user,
            token,
            expiresAt
        );

        return {
            status: true,
            message: "Verification email has been sent.",
            data: null
        }
    }

    private async sendVerificationEmail(user: any, token: string, expiresAt: Date) {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4000'; 
        const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`; 
        
        await this.emailService.sendVerificationEmail(user.email, { verificationUrl, recipientName: user.profile?.fullName, expiresIn: expiresAt })
        
        this.logger.log( `Verification email generated for ${user.email}`, ); 
        this.logger.debug( `Verification URL: ${verificationUrl}`, );
    }

    private generateVerificationToken() {
        // Token that will be sent to the user
        const token = randomBytes(32).toString('hex');

        // Only the has is stored in the database
        const tokenHash = this.hashToken(token);

        // Token is valid for 24 Hours
        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        )

        return {
            token,
            tokenHash,
            expiresAt,
        }
    }

    private session(user: User) {
        return {
            accessToken: this.jwtService.sign({
                sub: user.id,
                email: user.email,
                role: user.role,
            }),
            user: this.sanitizeUser(user)
        }
    }

    private sanitizeUser(user: User) {
        const {
            passwordHash,
            verificationTokenHash,
            verificationTokenExpiresAt,
            rememberToken,
            ...safeUser
        } = user;

        return safeUser;
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    
}