// src/modules/brands/brands.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { PrismaService } from '@/database/prisma.service';
import { type Brand, Prisma } from '@/generated/prisma/client';
import type { BrandQueryDto } from './dto/brand-query.dto';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      return await this.prisma.brand.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          website: dto.website,
        },
      });
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

    const filterWhere = isActive === undefined ? undefined : { isActive };

    const [rawName, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const nameCursor = typeof rawName === 'string' ? rawName : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const { where, orderBy, take } = withCursorPagination({
      where: filterWhere,
      limit: limit + 1,
      cursors: [
        ['name', 'asc', nameCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.brand.findMany({
      where: where as Prisma.BrandWhereInput,
      orderBy: orderBy as Prisma.BrandOrderByWithRelationInput[],
      take,
    });

    return toCursorPage(rows, limit, (last) => [last.name, last.id]);
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.prisma.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    try {
      return await this.prisma.brand.update({ where: { id }, data: dto });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A brand with this name or slug already exists',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Brand ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Brand> {
    try {
      return await this.prisma.brand.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Brand ${id} not found`);
      }
      throw error;
    }
  }
}
