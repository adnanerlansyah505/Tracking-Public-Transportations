import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '../../modules/auth/decorators/roles.decorator';
import { userRoleEnum, userStatusEnum } from './enums/user.enum';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 120 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.Passenger),
  emailVerifiedAt: timestamp('email_verified_at'),
  verificationTokenHash: varchar('verification_token_hash'),
  verificationTokenExpiresAt: timestamp('verification_token_hash_at'),
  status: userStatusEnum('status').notNull().default('active'),
  rememberToken: varchar('remember_token', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
