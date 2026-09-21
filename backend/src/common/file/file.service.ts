import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  existsSync,
  mkdirSync,
  unlink,
} from 'node:fs';
import { promises as fs } from 'fs';

import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

@Injectable()
export class FileService {

  private uploadDirectory?: string;

  /**
   * Resolved on first use rather than in the constructor: serverless platforms
   * mount the application directory read-only, and touching the filesystem
   * there would stop the whole application from booting.
   */
  private getUploadDirectory(): string {
    if (this.uploadDirectory) {
      return this.uploadDirectory;
    }

    const candidates = [
      process.env.UPLOAD_DIR,
      join(process.cwd(), 'uploads'),
      join(tmpdir(), 'angkot-uploads'),
    ].filter(
      (candidate): candidate is string =>
        Boolean(candidate),
    );

    for (const candidate of candidates) {
      try {
        mkdirSync(candidate, {
          recursive: true,
        });

        this.uploadDirectory = candidate;

        return candidate;
      } catch {
        // Read-only or unavailable location: try the next candidate.
      }
    }

    throw new InternalServerErrorException(
      'No writable upload directory is available',
    );
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
      this.getUploadDirectory(),
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
     * <upload directory>/profiles/abc.jpg
     */
    const relativePath = filePath
      .replace(/^\/+/, '')
      .replace(/^uploads\/+/, '');

    const absolutePath = join(
      this.getUploadDirectory(),
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
