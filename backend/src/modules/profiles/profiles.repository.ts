import { Inject } from "@nestjs/common";
import { DB } from "../../database/database.module";
import type { DbClient, DbTransaction } from "../../database/database.module";
import { profiles } from "../../database/schema";
import { eq } from "drizzle-orm";

export class ProfileRepository {

    constructor (
        @Inject(DB)
        private readonly db: DbClient
    ) {}


  async findById(id: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    return profile ?? null;
  }

  async findByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return profile ?? null;
  }
  
  async create(
        data: {
            userId: string;
            fullName: string;
            city: string;
            country?: string;
            bio?: string;
            phone?: string;
            photo?: string;
            address?: string;
            gender?: 'male' | 'female';
            birthDate: string;
        },
        tx?: DbTransaction,
    ) {
        const client = tx ?? this.db;
        const [profile] = await client
            .insert(profiles)
            .values(data)
            .returning();

        return profile ?? null;
    }

    async update(
        id: string,
        data: Partial<{
            fullName: string;
            city: string;
            country: string;
            birthDate: string;
            gender: 'male' | 'female';
            photo: string;
        }>,
        tx?: DbTransaction
    ) {
        const client = tx ?? this.db;
        const [profile] = await client
            .update(profiles)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(profiles.id, id))
            .returning();

        return profile ?? null;
    }

}
