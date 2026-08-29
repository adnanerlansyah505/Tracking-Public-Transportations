import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { ProfilesService } from './profile.service';
import { UpdateProfileDTO } from './dto/update.dto';
import { ImageValidationPipe } from '../../common/file/file.pipe';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfilesService,
  ) {}

  @Get()
  async getMyProfile(@Req() req: any) {
    return this.profileService.findByUserId(
      req.user.sub,
    );
  }

  @Patch()
  @UseInterceptors(
    FileInterceptor('photo'),
  )
  async updateMyProfile(
    @Req() req: any,

    @Body()
    dto: UpdateProfileDTO,

    @UploadedFile(ImageValidationPipe)
    photo?: Express.Multer.File,
  ) {
    return this.profileService.update(
      req.user.id,
      dto,
      photo,
    );
  }
}