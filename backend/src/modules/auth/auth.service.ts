import { BadRequestException, ConflictException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { DB } from "../../database/database.module";
import type { DbClient } from "../../database/database.module";
import { UserRepository } from "../users/users.repository";
import { RegisterDTO } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';
import { LoginDTO } from "./dto/login.dto";
import { User } from "../../database/schema";
import { JwtService } from "@nestjs/jwt";
import { ProfileRepository } from "../profiles/profiles.repository";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(DB) private db: DbClient,
        private userRepository: UserRepository,
        private profileRepository: ProfileRepository,
        private jwtService: JwtService
    ) {}

    async register(dto: RegisterDTO) {
        const existing = await this.userRepository.findByEmail(dto.email);
        
        if (existing) throw new ConflictException('Email is already registered');

        const passwordHash = await bcrypt.hash(dto.password, 12);
                
        const result = await this.db.transaction(async (tx) => {
            const user = await this.userRepository.create(
                {
                    email: dto.email,
                    passwordHash
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

    private session(user: User) {
        return {
            accessToken: this.jwtService.sign({
                sub: user.id,
                email: user.email,
            }),
            user: this.sanitizeUser(user)
        }
    }

    private sanitizeUser(user: User) {
        const {
            passwordHash,
            ...safeUser
        } = user;

        return safeUser;
    }

    
}