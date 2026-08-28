import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
// import { EmailModule } from '../email/email.module';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { MatchConstraint } from '../../common/validators/match.validator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { EmailModule } from '../../common/email/email.module';
// import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ProfilesModule,
    EmailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<StringValue | number>(
            'JWT_EXPIRES_IN',
            '1d' as StringValue,
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MatchConstraint],
  exports: [AuthService],
})
export class AuthModule {}
