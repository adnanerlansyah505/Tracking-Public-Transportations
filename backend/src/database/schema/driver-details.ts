import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

/** Driver application and vehicle information awaiting admin approval. */
export const driverDetails = pgTable('driver_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  identityCardNumber: varchar('identity_card_number', { length: 64 }).notNull().unique(),
  vehiclePlateNumber: varchar('vehicle_plate_number', { length: 32 }).notNull().unique(),
  routeCode: varchar('route_code', { length: 64 }),
  vehicleManufactureYear: integer('vehicle_manufacture_year').notNull(),
  startRoute: varchar('start_route', { length: 160 }).notNull(),
  endRoute: varchar('end_route', { length: 160 }).notNull(),
  passengerCapacity: integer('passenger_capacity').notNull(),
  registrationDocument: varchar('registration_document', { length: 512 }).notNull(),
  operationPermit: varchar('operation_permit', { length: 512 }).notNull(),
  vehiclePhoto: varchar('vehicle_photo', { length: 512 }).notNull(),
  activatedAt: timestamp('activated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type DriverDetail = typeof driverDetails.$inferSelect;
