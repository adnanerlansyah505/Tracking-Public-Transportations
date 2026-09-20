import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { driverRequestStatusEnum } from './enums/driver-request.enum';

/** Proposed vehicle details a driver submits for admin review. */
export interface DriverRequestPayload {
  identityCardNumber: string;
  vehiclePlateNumber: string;
  routeCode: string | null;
  vehicleManufactureYear: number;
  startRoute: string;
  endRoute: string;
  passengerCapacity: number;
  registrationDocument?: string | null;
  operationPermit?: string | null;
  vehiclePhoto?: string | null;
}

/**
 * Vehicle/operation changes proposed by a driver. Approving a request applies
 * its payload to `driver_details`; until then the live details are unchanged.
 */
export const driverChangeRequests = pgTable('driver_change_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  driverId: uuid('driver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').$type<DriverRequestPayload>().notNull(),
  status: driverRequestStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type DriverChangeRequest = typeof driverChangeRequests.$inferSelect;
export type NewDriverChangeRequest = typeof driverChangeRequests.$inferInsert;
