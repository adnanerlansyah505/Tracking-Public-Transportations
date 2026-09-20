import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DB } from '../../database/database.module';
import type { DbClient } from '../../database/database.module';
import { UserRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { DriverRepository } from './driver.repository';
import { AuthRepository } from '../auth/auth.repository';
import { UserRole } from '../auth/decorators/roles.decorator';
import { FileService } from '../../common/file/file.service';
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE, MAX_IMAGE_SIZE } from '../../common/file/file.constants';
import { validateUploadFiles } from '../../common/file/file.validation';
import { driverDetails } from '../../database/schema';
import type { DriverRequestPayload } from '../../database/schema';
import type { DriverRequestStatus } from '../../database/schema/enums/driver-request.enum';
import { UpsertDriverDetailsDTO } from './dto/upsert-driver-details.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/** Optional evidence a driver may attach to a vehicle change request. */
export interface DriverVehicleFiles {
  registrationDocument?: Express.Multer.File;
  operationPermit?: Express.Multer.File;
  vehiclePhoto?: Express.Multer.File;
}

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @Inject(DB) private readonly db: DbClient,
    private readonly users: UserRepository,
    private readonly driverRepository: DriverRepository,
    private readonly authTokens: AuthRepository,
    private readonly notifications: NotificationsService,
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

  /** The signed-in driver's own vehicle details (null until completed). */
  async getMyDetails(userId: string) {
    return this.driverRepository.findByUserId(userId);
  }

  /** The signed-in driver's vehicle change requests, newest first. */
  async listMyVehicleRequests(userId: string) {
    return this.driverRepository.findChangeRequestsByDriver(userId);
  }

  /** Submit vehicle/operation changes for admin review. */
  async submitMyVehicleRequest(
    userId: string,
    dto: UpsertDriverDetailsDTO,
    files: DriverVehicleFiles,
  ) {
    const pending = await this.driverRepository.findPendingChangeRequestByDriver(userId);
    if (pending) {
      throw new ConflictException('You already have a vehicle update awaiting review.');
    }

    const conflicting = await this.driverRepository.findByIdentityCardOrPlate(
      dto.identityCardNumber,
      dto.vehiclePlateNumber,
    );

    if (conflicting && conflicting.userId !== userId) {
      throw new ConflictException('Driver ID card or vehicle plate number is already registered.');
    }

    validateUploadFiles({ ...files }, [
      {
        field: 'registrationDocument',
        required: false,
        maxSize: MAX_DOCUMENT_SIZE,
        allowedMimeTypes: DOCUMENT_MIME_TYPES,
        invalidMessage: 'Registration Document must be a PDF, JPG, PNG, or WEBP file no larger than 10 MB',
      },
      {
        field: 'operationPermit',
        required: false,
        maxSize: MAX_DOCUMENT_SIZE,
        allowedMimeTypes: DOCUMENT_MIME_TYPES,
        invalidMessage: 'Operation Permit must be a PDF, JPG, PNG, or WEBP file no larger than 10 MB',
      },
      {
        field: 'vehiclePhoto',
        required: false,
        maxSize: MAX_IMAGE_SIZE,
        allowedMimeTypes: /^image\/(jpeg|png|webp)$/,
        invalidMessage: 'Vehicle Photo must be a JPG, PNG, or WEBP image no larger than 5 MB',
      },
    ]);

    const savedFiles: string[] = [];
    const filePaths: Partial<DriverRequestPayload> = {};

    try {
      if (files.registrationDocument) {
        const saved = await this.files.save(files.registrationDocument, 'driver-documents');
        savedFiles.push(saved.path);
        filePaths.registrationDocument = saved.path;
      }
      if (files.operationPermit) {
        const saved = await this.files.save(files.operationPermit, 'driver-documents');
        savedFiles.push(saved.path);
        filePaths.operationPermit = saved.path;
      }
      if (files.vehiclePhoto) {
        const saved = await this.files.save(files.vehiclePhoto, 'driver-vehicles');
        savedFiles.push(saved.path);
        filePaths.vehiclePhoto = saved.path;
      }

      const request = await this.driverRepository.createChangeRequest({
        driverId: userId,
        status: 'pending',
        payload: { ...this.toVehiclePayload(dto), ...filePaths },
      });

      if (request) {
        await this.notifications.notifyAdmins({
          type: 'driver_request.created',
          title: 'New vehicle update request',
          body: `${request.payload.vehiclePlateNumber} · ${request.payload.startRoute} → ${request.payload.endRoute}.`,
          data: { requestId: request.id },
        });
      }

      return request;
    } catch (error) {
      await Promise.allSettled(savedFiles.map((path) => this.files.delete(path)));
      throw error;
    }
  }

  /** Admin queue of vehicle change requests. */
  async listVehicleRequests(status: DriverRequestStatus = 'pending') {
    return this.driverRepository.listChangeRequests(status);
  }

  /** Approve a request and apply its payload to the driver's live details. */
  async approveVehicleRequest(id: string, admin: { id: string }) {
    const request = await this.driverRepository.findChangeRequestById(id);
    if (!request) throw new NotFoundException('Driver request not found.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    await this.applyDriverDetails(request.driverId, request.payload);

    const updated = await this.driverRepository.updateChangeRequest(id, {
      status: 'approved',
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    });

    await this.notifications.notify(request.driverId, {
      type: 'driver_request.approved',
      title: 'Vehicle update approved',
      body: `Your vehicle details (${request.payload.vehiclePlateNumber}) are now live.`,
      data: { requestId: request.id },
    });

    return updated;
  }

  /** Reject a request and discard any evidence uploaded with it. */
  async rejectVehicleRequest(id: string, reason: string, admin: { id: string }) {
    const request = await this.driverRepository.findChangeRequestById(id);
    if (!request) throw new NotFoundException('Driver request not found.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    await this.deleteRequestEvidence(request.payload);

    const updated = await this.driverRepository.updateChangeRequest(id, {
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    });

    await this.notifications.notify(request.driverId, {
      type: 'driver_request.rejected',
      title: 'Vehicle update rejected',
      body: `${request.payload.vehiclePlateNumber}: ${reason.trim()}`,
      data: { requestId: request.id },
    });

    return updated;
  }

  private toVehiclePayload(dto: UpsertDriverDetailsDTO) {
    return {
      identityCardNumber: dto.identityCardNumber.trim(),
      vehiclePlateNumber: dto.vehiclePlateNumber.trim(),
      routeCode: dto.routeCode?.trim() || null,
      vehicleManufactureYear: dto.vehicleManufactureYear,
      startRoute: dto.startRoute.trim(),
      endRoute: dto.endRoute.trim(),
      passengerCapacity: dto.passengerCapacity,
    };
  }

  private async applyDriverDetails(driverId: string, payload: DriverRequestPayload) {
    const existing = await this.driverRepository.findByUserId(driverId);
    const { registrationDocument, operationPermit, vehiclePhoto, ...fields } = payload;

    const fileFields: Partial<typeof driverDetails.$inferInsert> = {};
    if (registrationDocument) fileFields.registrationDocument = registrationDocument;
    if (operationPermit) fileFields.operationPermit = operationPermit;
    if (vehiclePhoto) fileFields.vehiclePhoto = vehiclePhoto;

    if (existing) {
      const updated = await this.driverRepository.updateByUserId(driverId, { ...fields, ...fileFields });
      await this.removeReplacedEvidence(existing, fileFields);
      return updated;
    }

    return this.driverRepository.create({ userId: driverId, ...fields, ...fileFields });
  }

  private async deleteRequestEvidence(payload: DriverRequestPayload) {
    const paths = [payload.registrationDocument, payload.operationPermit, payload.vehiclePhoto]
      .filter((path): path is string => Boolean(path));

    if (paths.length) {
      await Promise.allSettled(paths.map((path) => this.files.delete(path)));
    }
  }

  /** Delete evidence files that a fresh upload has replaced. */
  private async removeReplacedEvidence(
    existing: {
      registrationDocument?: string | null;
      operationPermit?: string | null;
      vehiclePhoto?: string | null;
    },
    replaced: Partial<typeof driverDetails.$inferInsert>,
  ) {
    const stale = [
      replaced.registrationDocument ? existing.registrationDocument : null,
      replaced.operationPermit ? existing.operationPermit : null,
      replaced.vehiclePhoto ? existing.vehiclePhoto : null,
    ].filter((path): path is string => Boolean(path));

    if (stale.length) {
      await Promise.allSettled(stale.map((path) => this.files.delete(path)));
    }
  }

  private async find(id: string) {
    const user = await this.users.findById(id);
    if (!user || user.role !== UserRole.Driver) {
      throw new NotFoundException('Driver not found.');
    }
    return user;
  }
}
