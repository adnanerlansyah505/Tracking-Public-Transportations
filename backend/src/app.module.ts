import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config"
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { UsersService } from './modules/users/users.service';
import { UsersController } from './modules/users/users.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottleGuard } from './common/guards/throttler.guard';
import { CsrfModule } from './modules/csrf/csrf.module';
import { AppCacheModule } from './common/cache/cache.module';
import { FileModule } from './common/file/file.module';
import { EmailModule } from './common/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    
    AppCacheModule,

    FileModule,

    EmailModule,

    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    CsrfModule,
    ThrottlerModule.forRoot([
      // {
      //   name: 'default',
      //   ttl: 60000,
      //   limit: 10,
      // },
    ]),
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottleGuard },
  ],
})
export class AppModule {}
