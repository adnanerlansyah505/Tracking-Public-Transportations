import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
  HealthIndicatorService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

import { sql } from 'drizzle-orm';

import { Public } from '../auth/decorators/public.decorator';
import { DB, type DbClient } from '../../database/database.module';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private indicators: HealthIndicatorService,

    @Inject(DB)
    private readonly db: DbClient,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. Check an external API or your own homepage
      () => this.http.pingCheck('nestjs-docs', 'https://nestjs.com'),

      // 2. Check the database. This application talks to Postgres through
      // Drizzle, so the check runs a query on the shared pool.
      async () => {
        const indicator = this.indicators.check('database');

        try {
          await this.db.execute(sql`select 1`);

          return indicator.up();
        } catch (error) {
          return indicator.down({
            message:
              error instanceof Error
                ? error.message
                : 'Database is unreachable',
          });
        }
      },

      // 3. Check Memory Heap (fails if it exceeds 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
