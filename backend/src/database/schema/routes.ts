import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';
import { routeStatusEnum } from './enums/route.enum';

/** A single stop on a route, stored inline to match the frontend TransitStop shape. */
export interface RouteStop {
  id: string;
  name: string;
  coordinates: [number, number];
  zone: string;
}

/**
 * Travel routes. Admin-created rows are approved immediately; driver submissions
 * start as `pending` and are reviewed by an admin.
 */
export const routes = pgTable('routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  origin: varchar('origin', { length: 160 }).notNull(),
  destination: varchar('destination', { length: 160 }).notNull(),
  city: varchar('city', { length: 120 }).notNull().default('Bandung'),
  fare: varchar('fare', { length: 32 }).notNull(),
  operatingHours: varchar('operating_hours', { length: 64 }).notNull(),
  color: varchar('color', { length: 16 }).notNull().default('#123d8d'),
  maxCapacity: integer('max_capacity').notNull(),
  stops: jsonb('stops').$type<RouteStop[]>().notNull(),
  path: jsonb('path').$type<[number, number][]>().notNull(),
  status: routeStatusEnum('status').notNull().default('pending'),
  submittedBy: uuid('submitted_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
