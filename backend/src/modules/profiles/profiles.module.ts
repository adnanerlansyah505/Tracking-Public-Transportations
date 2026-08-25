import { Module } from '@nestjs/common';
import { ProfileRepository } from './profiles.repository';
import { ProfileController } from './profile.controller';
import { ProfilesService } from './profile.service';

@Module({
  imports: [
  ],
  controllers: [ProfileController],
  providers: [ProfilesService, ProfileRepository],
  exports: [
    ProfilesService,
    ProfileRepository
  ],
})
export class ProfilesModule {}
