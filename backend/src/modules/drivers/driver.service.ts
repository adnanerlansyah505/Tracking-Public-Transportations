import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DB } from '../../database/database.module';
import type { DbClient } from '../../database/database.module';
import { UserRepository } from '../users/users.repository';
import { DriverRepository } from './driver.repository';
import { AuthRepository } from '../auth/auth.repository';
import { UserRole } from '../auth/decorators/roles.decorator';
import { FileService } from '../../common/file/file.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @Inject(DB) private readonly db: DbClient,
    private readonly users: UserRepository,
    private readonly driverRepository: DriverRepository,
    private readonly authTokens: AuthRepository,
    private readonly files: FileService,
    @Inject(CACHE_MANAGER) 
    private readonly cacheManager: Cache,
  ) {}

  async list(page: number, pageSize: number) {
    const cacheKey = `drivers:list:${page}:${pageSize}`;

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) return cached;

    const result = await this.driverRepository.findAll(page, pageSize);

    await this.cacheManager.set(cacheKey, result, 60_000);

    return result;

  }

  async activate(id: string) {
    const driver = await this.find(id);

    if (driver.status !== 'pending_activation') {
      return { message: 'Driver has already activated.' };
    }

    await this.users.update(driver.id, { status: 'active' });
    await this.driverRepository.activate(driver.id);
    return { message: 'Driver account activated successfully.' };
  }

  async deactivate(id: string) {
    const driver = await this.find(id);

    if (driver.status !== 'active') {
      throw new BadRequestException('Only active driver accounts can be deactivated.');
    }

    // const details = await this.driverRepository.findByUserId(driver.id);
    // await this.db.transaction(async (tx) => {
    //   await this.users.update(driver.id, { status: 'pending_activation' }, tx);
    //   await this.authTokens.invalidateActiveTokensForUser(driver.id, 'refresh_token', tx);
    //   await this.driverRepository.clearEvidenceFiles(driver.id, tx);
    // });

    // const removalResults = await Promise.allSettled([
    //   this.files.delete(details?.registrationDocument),
    //   this.files.delete(details?.operationPermit),
    //   this.files.delete(details?.vehiclePhoto),
    // ]);

    // for (const result of removalResults) {
    //   if (result.status === 'rejected') {
    //     this.logger.error('Failed to remove deactivated driver evidence file.', result.reason);
    //   }
    // }

    return { message: 'Driver account deactivated successfully.' };
  }

  private async find(id: string) {
    const user = await this.users.findById(id);
    if (!user || user.role !== UserRole.Driver) {
      throw new NotFoundException('Driver not found.');
    }
    return user;
  }
}
