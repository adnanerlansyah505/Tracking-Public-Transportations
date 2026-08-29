import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const DB = Symbol("DB");
export type DbClient = ReturnType<typeof drizzle<typeof schema>>;
export type DbTransaction =
  Parameters<DbClient['transaction']>[0] extends (
    tx: infer T,
  ) => any
    ? T
    : never;

@Global()
@Module({
    providers: [
        {
            provide: DB,
            inject: [ConfigService],
            useFactory: (config:  ConfigService) => {
                const pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
                return drizzle(pool, { schema });
            }
        }
    ],
    exports: [DB],
})
export class DatabaseModule{}