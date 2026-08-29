import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
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
