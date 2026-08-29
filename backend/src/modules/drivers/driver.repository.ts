import { Inject, Injectable } from '@nestjs/common';
import { count, eq, isNull, or } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import type { DbClient, DbTransaction } from '../../database/database.module';
import { driverDetails } from '../../database/schema';

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
    const [detail] = await this.db.select().from(driverDetails).where(eq(driverDetails.userId, userId)).limit(1);
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

  async findByIdentityCardOrPlate(identityCardNumber: string, vehiclePlateNumber: string) {
    const [detail] = await this.db.select().from(driverDetails).where(or(
      eq(driverDetails.identityCardNumber, identityCardNumber),
      eq(driverDetails.vehiclePlateNumber, vehiclePlateNumber),
    )).limit(1);
    return detail ?? null;
  }
}
