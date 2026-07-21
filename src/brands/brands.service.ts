// src/brands/brands.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { DatabaseService } from '@/database/database.service';
import { type Brand, brands } from '@/database/schema';
import type { BrandQueryDto } from './dto/brand-query.dto';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      const [brand] = await this.db
        .insert(brands)
        .values({
          name: dto.name,
          slug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          website: dto.website,
        })
        .returning();

      return brand;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A brand with this name or slug already exists',
        );
      }
      throw error;
    }
  }

  /** Keyset pagination ordered alphabetically by name, id as the unique tiebreaker. */
  async findAll(query: BrandQueryDto): Promise<CursorPaginatedResult<Brand>> {
    const { limit, cursor, isActive } = query;

    const filterWhere =
      isActive === undefined ? undefined : eq(brands.isActive, isActive);

    const [rawName, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const nameCursor = typeof rawName === 'string' ? rawName : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      where: filterWhere,
      limit: limit + 1,
      cursors: [
        [brands.name, 'asc', nameCursor],
        [brands.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(brands)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.name, last.id) : null;

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  async findOne(id: string): Promise<Brand> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    try {
      const [brand] = await this.db
        .update(brands)
        .set(dto)
        .where(eq(brands.id, id))
        .returning();

      if (!brand) {
        throw new NotFoundException(`Brand ${id} not found`);
      }

      return brand;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A brand with this name or slug already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Brand> {
    const [brand] = await this.db
      .delete(brands)
      .where(eq(brands.id, id))
      .returning();

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    return brand;
  }
}
