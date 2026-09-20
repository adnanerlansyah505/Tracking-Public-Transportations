import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import type { DbClient, DbTransaction } from '../../database/database.module';
import { routes } from '../../database/schema';
import type { RouteStatus } from '../../database/schema/enums/route.enum';

interface FindRoutesOptions {
  page: number;
  pageSize: number;
  status?: RouteStatus;
  search?: string;
  city?: string;
  submittedBy?: string;
}

@Injectable()
export class RoutesRepository {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  async create(data: typeof routes.$inferInsert, tx?: DbTransaction) {
    const [route] = await (tx ?? this.db).insert(routes).values(data).returning();
    return route ?? null;
  }

  async findMany(options: FindRoutesOptions) {
    const offset = (options.page - 1) * options.pageSize;
    const where = this.buildFilters(options);

    const [routeRows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(routes)
        .where(where)
        .orderBy(desc(routes.createdAt))
        .limit(options.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(routes).where(where),
    ]);

    const total = totalRows[0]?.value ?? 0;

    return {
      routes: routeRows,
      metadata: {
        page: options.page,
        pageSize: options.pageSize,
        total,
        totalPages: Math.ceil(total / options.pageSize),
      },
    };
  }

  async findById(id: string) {
    const [route] = await this.db
      .select()
      .from(routes)
      .where(and(eq(routes.id, id), isNull(routes.deletedAt)))
      .limit(1);
    return route ?? null;
  }

  async findByCode(code: string) {
    const [route] = await this.db
      .select()
      .from(routes)
      .where(and(eq(routes.code, code), isNull(routes.deletedAt)))
      .limit(1);
    return route ?? null;
  }

  async update(id: string, data: Partial<typeof routes.$inferInsert>, tx?: DbTransaction) {
    const [route] = await (tx ?? this.db)
      .update(routes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(routes.id, id), isNull(routes.deletedAt)))
      .returning();
    return route ?? null;
  }

  async softDelete(id: string) {
    const [route] = await this.db
      .update(routes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(routes.id, id), isNull(routes.deletedAt)))
      .returning();
    return route ?? null;
  }

  async countByStatus(status?: RouteStatus) {
    const filters: SQL[] = [isNull(routes.deletedAt)];
    if (status) filters.push(eq(routes.status, status));

    const [result] = await this.db
      .select({ value: count() })
      .from(routes)
      .where(and(...filters));

    return result?.value ?? 0;
  }

  private buildFilters(options: FindRoutesOptions) {
    const filters: SQL[] = [isNull(routes.deletedAt)];

    if (options.status) filters.push(eq(routes.status, options.status));
    if (options.submittedBy) filters.push(eq(routes.submittedBy, options.submittedBy));
    if (options.city) filters.push(ilike(routes.city, `%${options.city}%`));

    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      const searchFilter = or(
        ilike(routes.code, pattern),
        ilike(routes.name, pattern),
        ilike(routes.origin, pattern),
        ilike(routes.destination, pattern),
      );
      if (searchFilter) filters.push(searchFilter);
    }

    return and(...filters);
  }
}
