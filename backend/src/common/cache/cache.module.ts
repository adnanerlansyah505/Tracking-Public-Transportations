import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}