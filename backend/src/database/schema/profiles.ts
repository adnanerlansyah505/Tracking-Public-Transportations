import { pgTable, timestamp, uuid, varchar, text, date } from 'drizzle-orm/pg-core';
import { users } from './users';
import { genderEnum } from './enums/profile.enum';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),

  fullName: varchar("fullName").notNull(),

  city: varchar("city", { length: 160 }).notNull(),

  country: varchar("country", { length: 120 }),

  bio: text("bio"),

  phone: varchar("phone", { length: 32 }),

  photo: varchar("photo"),

  address: varchar("address"),

  gender: genderEnum("gender"),

  birthDate: date("birthDate").notNull(),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull(),

  deletedAt: timestamp('deleted_at'),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
