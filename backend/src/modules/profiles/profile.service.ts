import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProfileRepository } from './profiles.repository';
import { UpdateProfileDTO } from './dto/update.dto';

import { CacheService } from '../../common/cache/cache.service';
import { FileService } from '../../common/file/file.service';

@Injectable()
export class ProfilesService {

  constructor(
    private readonly profileRepository: ProfileRepository,

    private readonly cacheService: CacheService,

    private readonly fileService: FileService,
  ) {}

  async findByUserId(userId: string) {
    const cacheKey =
      `user:profile:${userId}`;

    const cached =
      await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const profile =
      await this.profileRepository.findByUserId(
        userId,
      );

    if (!profile) {
      return null;
    }

    await this.cacheService.set(
      cacheKey,
      profile,
      300_000,
    );

    return profile;
  }

  async update(
    userId: string,
    dto: UpdateProfileDTO,
    photo?: Express.Multer.File,
  ) {
    const profile =
      await this.profileRepository.findByUserId(
        userId,
      );

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    let newPhotoPath: string | undefined;

    /*
     * Save new photo.
     */
    if (photo) {
      const savedFile =
        await this.fileService.save(
          photo,
          'profiles',
        );

      newPhotoPath = savedFile.path;
    }

    try {
      /*
       * Update profile.
       */
      const updatedProfile =
        await this.profileRepository.update(
          profile.id,
          {
            ...dto,

            ...(newPhotoPath
              ? {
                  photo: newPhotoPath,
                }
              : {}),
          },
        );

      /*
       * Database update succeeded.
       *
       * Now remove the previous photo.
       */
      if (
        newPhotoPath &&
        profile.photo
      ) {
        await this.fileService.delete(
          profile.photo,
        );
      }

      /*
       * Invalidate cache.
       */
      await this.cacheService.delete(
        `user:profile:${userId}`,
      );

      return updatedProfile;

    } catch (error) {

      /*
       * Database update failed.
       *
       * Remove newly uploaded file so
       * we don't leave an orphan file.
       */
      if (newPhotoPath) {
        await this.fileService.delete(
          newPhotoPath,
        );
      }

      throw error;
    }
  }
}