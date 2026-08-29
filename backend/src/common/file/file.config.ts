import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads',

    filename: (
      req,
      file,
      callback,
    ) => {
      const extension =
        extname(file.originalname);

      const filename =
        `${randomUUID()}${extension}`;

      callback(
        null,
        filename,
      );
    },
  }),
};