// src/modules/products/products.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductSort } from '@/common/enums/product-sort.enum';
import { ProductStatus } from '@/common/enums/product-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/postgres-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, type Product } from '@/generated/prisma/client';
import type { AdminProductQueryDto } from './dto/admin-product-query.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

// Full-text search results are ranked, not keyset-paginated (see
// `searchProducts`), so they're capped at a single bounded page.
const SEARCH_RESULT_LIMIT = 50;

// The generated `searchVector` tsvector is `Unsupported` in schema.prisma,
// so it's already excluded from the generated Product type — nothing to
// strip here, unlike the old `$inferSelect` Drizzle type.
// Product.price/weightKg are Prisma Decimal on read — the API contract is
// plain numbers, converted once at this boundary (toSafeProduct) or cast
// directly to ::float8 in the raw-SQL full-text search path below.
export type SafeProduct = Omit<Product, 'price' | 'weightKg'> & {
  price: number;
  weightKg: number | null;
};

export interface ProductWithFinalPrice extends SafeProduct {
  finalPrice: number;
}

function toSafeProduct(product: Product): SafeProduct {
  return {
    ...product,
    price: product.price.toNumber(),
    weightKg: product.weightKg ? product.weightKg.toNumber() : null,
  };
}

// category/brand slugs are resolved to ids once in queryProducts, then
// shared by both the query-builder list path (paginateProducts) and the
// raw-SQL full-text-search path (searchProducts).
interface ProductFilters {
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
}

// Only searchProducts needs a hand-built column list — ts_rank/tsquery over
// the raw-SQL full-text-search path have no query-builder equivalent.
const PRODUCT_COLUMNS_SQL = Prisma.sql`
  id, name, slug, description, sku,
  price::float8 AS price,
  discount_percentage AS "discountPercentage",
  stock,
  weight_kg::float8 AS "weightKg",
  dimensions_cm AS "dimensionsCm",
  specifications,
  category_id AS "categoryId",
  brand_id AS "brandId",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<ProductWithFinalPrice> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          sku: dto.sku,
          price: dto.price,
          discountPercentage: dto.discountPercentage,
          stock: dto.stock ?? 0,
          weightKg: dto.weightKg,
          dimensionsCm: dto.dimensionsCm,
          specifications: (dto.specifications ?? {}) as Prisma.InputJsonValue,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          status: dto.status ?? ProductStatus.Draft,
        },
      });

      return this.withFinalPrice(toSafeProduct(product));
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  /** Public catalog browse — only ever surfaces `active` products. */
  findAllPublic(
    query: ProductQueryDto,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    return this.queryProducts(query, ProductStatus.Active);
  }

  /** Admin listing — sees every status; can optionally filter to one. */
  findAllAdmin(
    query: AdminProductQueryDto,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    return this.queryProducts(query, query.status);
  }

  async findOnePublic(id: string): Promise<ProductWithFinalPrice> {
    const product = await this.prisma.product.findFirst({
      where: { id, status: ProductStatus.Active },
    });
    return this.toResponseOrThrow(product, id);
  }

  async findOneAdmin(id: string): Promise<ProductWithFinalPrice> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return this.toResponseOrThrow(product, id);
  }

  async findBySlugPublic(slug: string): Promise<ProductWithFinalPrice> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.Active },
    });

    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    return this.withFinalPrice(toSafeProduct(product));
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductWithFinalPrice> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: dto as Prisma.ProductUncheckedUpdateInput,
      });

      return this.withFinalPrice(toSafeProduct(product));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product ${id} not found`);
      }
      throw this.mapWriteError(error);
    }
  }

  async remove(id: string): Promise<ProductWithFinalPrice> {
    try {
      const product = await this.prisma.product.delete({ where: { id } });
      return this.withFinalPrice(toSafeProduct(product));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product ${id} not found`);
      }
      throw error;
    }
  }

  private mapWriteError(error: unknown): Error {
    if (isUniqueViolation(error)) {
      return new ConflictException(
        'A product with this slug or SKU already exists',
      );
    }
    if (isForeignKeyViolation(error)) {
      return new NotFoundException('Category or brand not found');
    }
    return error as Error;
  }

  private async toResponseOrThrow(
    product: Product | null,
    id: string,
  ): Promise<ProductWithFinalPrice> {
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.withFinalPrice(toSafeProduct(product));
  }

  private async queryProducts(
    query: ProductQueryDto,
    forcedStatus?: ProductStatus,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    const {
      limit,
      cursor,
      category,
      brand,
      search,
      sort = ProductSort.Newest,
    } = query;

    const filters: ProductFilters = { status: forcedStatus };

    if (category) {
      const found = await this.prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      if (!found) return this.emptyPage(limit);
      filters.categoryId = found.id;
    }

    if (brand) {
      const found = await this.prisma.brand.findUnique({
        where: { slug: brand },
        select: { id: true },
      });
      if (!found) return this.emptyPage(limit);
      filters.brandId = found.id;
    }

    if (search) {
      return this.searchProducts(search, filters, limit);
    }

    return this.paginateProducts(sort, filters, limit, cursor);
  }

  private emptyPage(
    limit: number,
  ): CursorPaginatedResult<ProductWithFinalPrice> {
    return { data: [], meta: { limit, hasNextPage: false, nextCursor: null } };
  }

  /**
   * Relevance ranking (ts_rank) isn't a stored column, so it can't be a
   * keyset cursor field — and `search_vector` is `Unsupported` in
   * schema.prisma, invisible to Prisma Client reads either way — so this
   * runs as one raw query, ranked and ordered entirely in SQL. Rather than
   * fake pagination over an unstable rank, search results are a single
   * bounded page. Deep pagination of ranked full-text search is a
   * deliberate limitation here; production search at real scale reaches
   * for dedicated infra (Elasticsearch, Algolia) instead of stretching
   * Postgres full-text search that far.
   */
  private async searchProducts(
    search: string,
    filters: ProductFilters,
    limit: number,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    const tsQuery = Prisma.sql`websearch_to_tsquery('english', ${search})`;
    const conditions: Prisma.Sql[] = [Prisma.sql`search_vector @@ ${tsQuery}`];
    if (filters.status) {
      conditions.push(Prisma.sql`status = ${filters.status}`);
    }
    if (filters.categoryId) {
      conditions.push(Prisma.sql`category_id = ${filters.categoryId}`);
    }
    if (filters.brandId) {
      conditions.push(Prisma.sql`brand_id = ${filters.brandId}`);
    }
    const whereSql = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<SafeProduct[]>(Prisma.sql`
      SELECT ${PRODUCT_COLUMNS_SQL}
      FROM products
      WHERE ${whereSql}
      ORDER BY ts_rank(search_vector, ${tsQuery}) DESC, id ASC
      LIMIT ${Math.min(limit, SEARCH_RESULT_LIMIT)}
    `);

    return {
      data: rows.map((row) => this.withFinalPrice(row)),
      meta: { limit, hasNextPage: false, nextCursor: null },
    };
  }

  private async paginateProducts(
    sort: ProductSort,
    filters: ProductFilters,
    limit: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    const [rawMode, rawPrimary, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined, undefined];

    // Cursors are order-dependent: a cursor minted while sorting by price
    // encodes a price value, which is meaningless if the caller then
    // switches to sorting by newest. Reject rather than silently mispaginate.
    if (cursor && rawMode !== sort) {
      throw new BadRequestException(
        'Cursor does not match the requested sort order',
      );
    }

    const isPriceSort = sort !== ProductSort.Newest;
    const primaryField = isPriceSort ? 'price' : 'createdAt';
    const primaryOrder: 'asc' | 'desc' =
      sort === ProductSort.PriceAsc ? 'asc' : 'desc';
    const primaryCursor = isPriceSort
      ? typeof rawPrimary === 'number'
        ? rawPrimary
        : undefined
      : typeof rawPrimary === 'string'
        ? new Date(rawPrimary)
        : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const baseWhere: Prisma.ProductWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
    };

    const { where, orderBy, take } = withCursorPagination({
      where: Object.keys(baseWhere).length ? baseWhere : undefined,
      limit: limit + 1,
      cursors: [
        [primaryField, primaryOrder, primaryCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.product.findMany({
      where: where as Prisma.ProductWhereInput,
      orderBy: orderBy as Prisma.ProductOrderByWithRelationInput[],
      take,
    });

    const page = toCursorPage(
      rows,
      limit,
      (last) => [
        sort,
        isPriceSort ? last.price.toNumber() : last.createdAt,
        last.id,
      ],
      toSafeProduct,
    );

    return {
      ...page,
      data: page.data.map((row) => this.withFinalPrice(row)),
    };
  }

  private withFinalPrice(product: SafeProduct): ProductWithFinalPrice {
    const finalPrice = product.discountPercentage
      ? Math.round(
          product.price * (1 - product.discountPercentage / 100) * 100,
        ) / 100
      : product.price;

    return { ...product, finalPrice };
  }
}
