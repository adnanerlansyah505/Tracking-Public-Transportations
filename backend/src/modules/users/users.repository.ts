import { Inject, Injectable } from "@nestjs/common";
import { DB } from "../../database/database.module";
import type { DbClient, DbTransaction } from "../../database/database.module";
import { driverDetails, profiles, users } from "../../database/schema";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { UserRole } from '../auth/decorators/roles.decorator';

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
                .leftJoin(
                    profiles,
                    and(eq(profiles.userId, users.id), isNull(profiles.deletedAt)),
                )
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

    async find(identifier: string | number, options?: { withProfile?: boolean; }) {
        if (options?.withProfile) {
            const [result] = await this.db
            .select()
            .from(users)
            .leftJoin(
                profiles,
                and(
                    eq(profiles.userId, users.id),
                    isNull(profiles.deletedAt),
                ),
            )
            .where(
                typeof identifier === "number"
                    ? eq(users.id, identifier.toString())
                    : eq(users.email, identifier.toLowerCase())
            )
            .limit(1);

            if (!result) {
                return null;
            }

            const user = {
                ...result.users,
                profile: result.profiles
            }

            return user;
        }

        const [user] = await this.db
            .select()
            .from(users)
            .where(
                or(eq(users.id, identifier.toString()), eq(users.email, identifier.toString()))
            )
            .limit(1);

        return user ?? null;
    }

    async findByEmail(email: string, options?: { withProfile?: boolean; }) {
        if (options?.withProfile) {
            const [result] = await this.db
            .select()
            .from(users)
            .leftJoin(
                profiles,
                and(
                    eq(profiles.userId, users.id),
                    isNull(profiles.deletedAt),
                ),
            )
            .where(
                and(
                    eq(users.email, email),
                    isNull(users.deletedAt),
                ),
            )
            .limit(1);

            if (!result) {
                return null;
            }

            const user = {
                ...result.users,
                profile: result.profiles
            }

            return user;
        }

        const [user] = await this.db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.email, email.toLowerCase()),
                    isNull(users.deletedAt)
                )
            )
            .limit(1);

        return user ?? null;
    }

    async findByUsername(username: string) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(and(eq(users.username, username.toLowerCase()), isNull(users.deletedAt)))
            .limit(1);

        return user ?? null;
    }

    async findByLoginIdentifier(identifier: string) {
        const rawIdentifier = identifier.trim();
        const normalized = rawIdentifier.toLowerCase();
        const [result] = await this.db
            .select({ user: users })
            .from(users)
            .leftJoin(driverDetails, eq(driverDetails.userId, users.id))
            .where(
                and(
                    isNull(users.deletedAt),
                    or(
                        eq(users.email, normalized),
                        and(eq(users.role, UserRole.Passenger), eq(users.username, normalized)),
                        eq(driverDetails.identityCardNumber, rawIdentifier),
                    ),
                ),
            )
            .limit(1);

        return result?.user ?? null;
    }

    async findById(id: string, options?: { withProfile?: boolean; }) {
        if (options?.withProfile) {
            const [result] = await this.db
            .select()
            .from(users)
            .leftJoin(
                profiles,
                and(
                    eq(profiles.userId, users.id),
                    isNull(profiles.deletedAt),
                ),
            )
            .where(
                and(
                    eq(users.id, id),
                    isNull(users.deletedAt),
                ),
            )
            .limit(1);

            if (!result) {
                return null;
            }

            const user = {
                ...result.users,
                profile: result.profiles
            }

            return user;
        }

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
        tx?: DbTransaction,
    ) {
        const client = tx ?? this.db;
        const [user] = await client
        .update(users)
        .set({
            ...data,
            updatedAt: new Date(),
        })
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
