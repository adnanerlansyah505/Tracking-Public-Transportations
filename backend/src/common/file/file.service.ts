import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  existsSync,
  mkdirSync,
  unlink,
  writeFile,
} from 'node:fs';
import { promises as fs } from 'fs';

import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FileService {

  private readonly uploadDirectory =
    join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!existsSync(this.uploadDirectory)) {
      mkdirSync(this.uploadDirectory, {
        recursive: true,
      });
    }
  }

  async save(
    file: Express.Multer.File,
    directory: string,
  ) {
    if (!file) {
      throw new InternalServerErrorException(
        'File is required',
      );
    }

    const directoryPath = join(
      this.uploadDirectory,
      directory,
    );

    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, {
        recursive: true,
      });
    }

    const extension =
      extname(file.originalname).toLowerCase();

    const filename =
      `${randomUUID()}${extension}`;

    const filePath = join(
      directoryPath,
      filename,
    );

    await fs.writeFile(
      filePath,
      file.buffer,
    );

    return {
      filename,
      path: `/uploads/${directory}/${filename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(
    filePath?: string | null,
  ): Promise<void> {
    if (!filePath) {
      return;
    }

    /*
     * Convert:
     *
     * /uploads/profiles/abc.jpg
     *
     * into:
     *
     * <project>/uploads/profiles/abc.jpg
     */
    const relativePath =
      filePath.replace(/^\/+/, '');

    const absolutePath =
      join(
        process.cwd(),
        relativePath,
      );

    try {
      await new Promise<void>((resolve, reject) => {
        unlink(absolutePath, (error) => {
          if (error?.code === 'ENOENT') {
            resolve();
            return;
          }

          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete file',
      );
    }
  }
}