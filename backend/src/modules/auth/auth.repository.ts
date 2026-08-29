import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull } from "drizzle-orm";
import { DB } from "../../database/database.module";
import type { DbClient, DbTransaction } from "../../database/database.module";
import { authTokens } from "../../database/schema";

export type AuthTokenType = 'email_verification' | 'password_reset' | 'refresh_token';

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DB)
    private readonly db: DbClient,
  ) {}

  async create(
    data: {
      userId: string;
      type: AuthTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: DbTransaction,
  ) {
    const client = tx ?? this.db;
    const [token] = await client
      .insert(authTokens)
      .values(data)
      .returning();

    return token ?? null;
  }

  async markUsed(id: string, usedAt = new Date(), tx?: DbTransaction) {
    const client = tx ?? this.db;
    const [token] = await client
      .update(authTokens)
      .set({ usedAt })
      .where(eq(authTokens.id, id))
      .returning();

    return token ?? null;
  }

  async invalidateActiveTokensForUser(
    userId: string,
    type: AuthTokenType,
    tx?: DbTransaction,
  ) {
    const client = tx ?? this.db;

    await client
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.type, type),
          isNull(authTokens.usedAt),
        ),
      );
  }

  async findValidByTokenHash(tokenHash: string, type: AuthTokenType) {
    const [token] = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.type, type),
          isNull(authTokens.usedAt),
          gte(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return token ?? null;
  }

  /** Atomically consumes a token so a refresh token cannot be used twice. */
  async consumeValidTokenHash(tokenHash: string, type: AuthTokenType, tx?: DbTransaction) {
    const client = tx ?? this.db;
    const [token] = await client
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.type, type),
          isNull(authTokens.usedAt),
          gte(authTokens.expiresAt, new Date()),
        ),
      )
      .returning();

    return token ?? null;
  }
}
