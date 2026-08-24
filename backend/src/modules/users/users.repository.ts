import { Inject, Injectable } from "@nestjs/common";
import { DB } from "../../database/database.module";
import type { DbClient, DbTransaction } from "../../database/database.module";
import { users } from "../../database/schema";
import { and, count, eq, isNull } from "drizzle-orm";

@Injectable()
export class UserRepository {
    
    constructor(
        @Inject(DB)
        private readonly db: DbClient,
    ) {}

    async findAll(page: number = 1, pageSize: number = 10) {
        const offset = (page - 1 ) * pageSize;
        const where = isNull(users.deletedAt);

        const [userRows, totalUsers] = await Promise.all([
            this.db
                .select()
                .from(users)
                .where(where)
                .orderBy(users.createdAt)
                .limit(pageSize)
                .offset(offset),
            this.db.select({ value: count() }).from(users).where(where)
        ])

        const total = totalUsers[0]?.value ?? 0

        return {
            users: userRows,
            metadata: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }
    }

    async findByEmail(email: string) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.email, email.toLowerCase()),
                    isNull(users.deletedAt)
                )
            )
            .limit(1)

        return user ?? null;
    }

    async findById(id: string) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.id, id),
                    isNull(users.deletedAt)
                )
            )
            .limit(1)

        return user ?? null;
    }

    async create(
        data: typeof users.$inferInsert,
        tx?: DbTransaction,
    ) {
        const client = tx ?? this.db;
    const [user] = await client
            .insert(users)
            .values(data)
            .returning()

        return user ?? null;
    }
    
    async update(
        id: string,
        data: Partial<typeof users.$inferInsert>,
    ) {
        const [user] = await this.db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning()

        return user ?? null
    }

    async delete(
        id: string
    ) {
        const [user] = await this.db
        .delete(users)
        .where(
            and(
                eq(users.id, id),
                isNull(users.deletedAt)
            )
        )
        .returning()

        return user ?? null
    }

}