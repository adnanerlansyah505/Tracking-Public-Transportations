import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import type { DbClient, DbTransaction } from '../../database/database.module';
import { driverChangeRequests, driverDetails, profiles, users } from '../../database/schema';
import type { DriverRequestStatus } from '../../database/schema/enums/driver-request.enum';

@Injectable()
export class DriverRepository {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  async create(data: typeof driverDetails.$inferInsert, tx?: DbTransaction) {
    const [detail] = await (tx ?? this.db).insert(driverDetails).values(data).returning();
    return detail ?? null;
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    const offset = (page - 1) * pageSize;
    const where = isNull(driverDetails.deletedAt);

    const [driverRows, totalDrivers] = await Promise.all([
      this.db
        .select()
        .from(driverDetails)
        .where(where)
        .orderBy(driverDetails.createdAt)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(driverDetails).where(where)
    ]);

    const total = totalDrivers[0]?.value ?? 0;

    return {
      drivers: driverRows,
      metadata: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }
  }

  async findByUserId(userId: string) {
    const [detail] = await this.db
      .select()
      .from(driverDetails)
      .where(and(eq(driverDetails.userId, userId), isNull(driverDetails.deletedAt)))
      .limit(1);
    return detail ?? null;
  }

  async updateByUserId(
    userId: string,
    data: Partial<typeof driverDetails.$inferInsert>,
    tx?: DbTransaction,
  ) {
    const [detail] = await (tx ?? this.db)
      .update(driverDetails)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(driverDetails.userId, userId), isNull(driverDetails.deletedAt)))
      .returning();
    return detail ?? null;
  }

  async activate(userId: string) {
    const [detail] = await this.db.update(driverDetails).set({ activatedAt: new Date(), updatedAt: new Date() }).where(eq(driverDetails.userId, userId)).returning();
    return detail ?? null;
  }

  async clearEvidenceFiles(userId: string, tx?: DbTransaction) {
    const [detail] = await (tx ?? this.db).update(driverDetails).set({
      registrationDocument: null,
      operationPermit: null,
      vehiclePhoto: null,
      updatedAt: new Date(),
    }).where(eq(driverDetails.userId, userId)).returning();
    return detail ?? null;
  }

  async findManyByUserIds(userIds: string[]) {
    if (userIds.length === 0) return [];

    return this.db
      .select()
      .from(driverDetails)
      .where(and(
        inArray(driverDetails.userId, userIds),
        isNull(driverDetails.deletedAt),
      ));
  }

  async findByIdentityCardOrPlate(identityCardNumber: string, vehiclePlateNumber: string) {
    const [detail] = await this.db.select().from(driverDetails).where(or(
      eq(driverDetails.identityCardNumber, identityCardNumber),
      eq(driverDetails.vehiclePlateNumber, vehiclePlateNumber),
    )).limit(1);
    return detail ?? null;
  }

  // --- Driver change requests -------------------------------------------------

  async createChangeRequest(data: typeof driverChangeRequests.$inferInsert, tx?: DbTransaction) {
    const [request] = await (tx ?? this.db).insert(driverChangeRequests).values(data).returning();
    return request ?? null;
  }

  async findPendingChangeRequestByDriver(driverId: string) {
    const [request] = await this.db
      .select()
      .from(driverChangeRequests)
      .where(and(
        eq(driverChangeRequests.driverId, driverId),
        eq(driverChangeRequests.status, 'pending'),
        isNull(driverChangeRequests.deletedAt),
      ))
      .limit(1);
    return request ?? null;
  }

  async findChangeRequestsByDriver(driverId: string) {
    return this.db
      .select()
      .from(driverChangeRequests)
      .where(and(
        eq(driverChangeRequests.driverId, driverId),
        isNull(driverChangeRequests.deletedAt),
      ))
      .orderBy(desc(driverChangeRequests.createdAt));
  }

  async findChangeRequestById(id: string) {
    const [request] = await this.db
      .select()
      .from(driverChangeRequests)
      .where(and(eq(driverChangeRequests.id, id), isNull(driverChangeRequests.deletedAt)))
      .limit(1);
    return request ?? null;
  }

  async updateChangeRequest(
    id: string,
    data: Partial<typeof driverChangeRequests.$inferInsert>,
    tx?: DbTransaction,
  ) {
    const [request] = await (tx ?? this.db)
      .update(driverChangeRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(driverChangeRequests.id, id), isNull(driverChangeRequests.deletedAt)))
      .returning();
    return request ?? null;
  }

  /** Admin queue: requests joined with the applicant's account and profile. */
  async listChangeRequests(status?: DriverRequestStatus) {
    const filters = [isNull(driverChangeRequests.deletedAt)];
    if (status) filters.push(eq(driverChangeRequests.status, status));

    return this.db
      .select({
        request: driverChangeRequests,
        driver: {
          id: users.id,
          email: users.email,
          username: users.username,
          status: users.status,
        },
        profile: {
          fullName: profiles.fullName,
          phone: profiles.phone,
          city: profiles.city,
          photo: profiles.photo,
        },
      })
      .from(driverChangeRequests)
      .leftJoin(users, eq(users.id, driverChangeRequests.driverId))
      .leftJoin(profiles, and(
        eq(profiles.userId, driverChangeRequests.driverId),
        isNull(profiles.deletedAt),
      ))
      .where(and(...filters))
      .orderBy(desc(driverChangeRequests.createdAt));
  }
}
