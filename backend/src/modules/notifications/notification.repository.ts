import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import type { DbClient, DbTransaction } from '../../database/database.module';
import { notifications } from '../../database/schema';

@Injectable()
export class NotificationRepository {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  async create(data: typeof notifications.$inferInsert, tx?: DbTransaction) {
    const [row] = await (tx ?? this.db).insert(notifications).values(data).returning();
    return row ?? null;
  }

  async createMany(rows: Array<typeof notifications.$inferInsert>, tx?: DbTransaction) {
    if (rows.length === 0) return [];
    return (tx ?? this.db).insert(notifications).values(rows).returning();
  }

  async listForUser(userId: string, limit: number, offset = 0) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      // The id breaks ties so paging never skips or repeats a row.
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset(offset);
  }

  async countForUser(userId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    return row?.value ?? 0;
  }

  async countUnread(userId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return row?.value ?? 0;
  }

  async markRead(userId: string, id: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ))
      .returning();

    return row ?? null;
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  }

  /** Scoped to the owner, so one user can never delete another's notification. */
  async remove(userId: string, id: string) {
    const [row] = await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    return row ?? null;
  }
}
