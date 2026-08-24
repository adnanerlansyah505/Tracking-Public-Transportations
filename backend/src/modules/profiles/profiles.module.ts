import { Module } from '@nestjs/common';
import { ProfileRepository } from './profiles.repository';

@Module({
  imports: [
  ],
  controllers: [],
  providers: [ProfileRepository],
  exports: [
    ProfileRepository
  ],
})
export class ProfilesModule {}
