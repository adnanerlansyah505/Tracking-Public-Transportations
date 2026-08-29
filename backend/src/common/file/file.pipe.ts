import {
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';

import {
  MAX_IMAGE_SIZE,
  IMAGE_MIME_TYPES,
} from './file.constants';

export const ImageValidationPipe =
  new ParseFilePipeBuilder()
    .addMaxSizeValidator({
      maxSize: MAX_IMAGE_SIZE,
      errorMessage: 'Image size must not exceed 5 MB.',
    })
    .addFileTypeValidator({
      fileType: IMAGE_MIME_TYPES,
      errorMessage:
        'Only JPG, JPEG, PNG, and WEBP images are allowed.',
    })
    .build({
      errorHttpStatusCode:
        HttpStatus.UNPROCESSABLE_ENTITY,
    });