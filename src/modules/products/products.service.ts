// src/products/products.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, type SQL, sql } from 'drizzle-orm';
import { ProductSort } from '@/common/enums/product-sort.enum';
import { ProductStatus } from '@/common/enums/product-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/postgres-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { DatabaseService } from '@/database/database.service';
import { brands, categories, products } from '@/database/schema';
import type { AdminProductQueryDto } from './dto/admin-product-query.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

// Full-text search results are ranked, not keyset-paginated (see
// `searchProducts`), so they're capped at a single bounded page.
const SEARCH_RESULT_LIMIT = 50;

// The generated `searchVector` tsvector is an internal indexing detail, not
// part of the public API shape — select everything except it, everywhere,
// rather than fetching it and stripping it back out on every response.
const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  description: products.description,
  sku: products.sku,
  price: products.price,
  discountPercentage: products.discountPercentage,
  stock: products.stock,
  weightKg: products.weightKg,
  dimensionsCm: products.dimensionsCm,
  specifications: products.specifications,
  categoryId: products.categoryId,
  brandId: products.brandId,
  status: products.status,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
} as const;

export type SafeProduct = Omit<typeof products.$inferSelect, 'searchVector'>;

export interface ProductWithFinalPrice extends SafeProduct {
  finalPrice: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async create(dto: CreateProductDto): Promise<ProductWithFinalPrice> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      const [product] = await this.db
        .insert(products)
        .values({
          name: dto.name,
          slug,
          description: dto.description,
          sku: dto.sku,
          price: dto.price,
          discountPercentage: dto.discountPercentage,
          stock: dto.stock ?? 0,
          weightKg: dto.weightKg,
          dimensionsCm: dto.dimensionsCm,
          specifications: dto.specifications ?? {},
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          status: dto.status ?? ProductStatus.Draft,
        })
        .returning(productColumns);

      return this.withFinalPrice(product);
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
    return this.findOneWhere(
      and(eq(products.id, id), eq(products.status, ProductStatus.Active)),
      id,
    );
  }

  async findOneAdmin(id: string): Promise<ProductWithFinalPrice> {
    return this.findOneWhere(eq(products.id, id), id);
  }

  async findBySlugPublic(slug: string): Promise<ProductWithFinalPrice> {
    const [product] = await this.db
      .select(productColumns)
      .from(products)
      .where(
        and(eq(products.slug, slug), eq(products.status, ProductStatus.Active)),
      )
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    return this.withFinalPrice(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductWithFinalPrice> {
    try {
      const [product] = await this.db
        .update(products)
        .set(dto)
        .where(eq(products.id, id))
        .returning(productColumns);

      if (!product) {
        throw new NotFoundException(`Product ${id} not found`);
      }

      return this.withFinalPrice(product);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async remove(id: string): Promise<ProductWithFinalPrice> {
    const [product] = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning(productColumns);

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.withFinalPrice(product);
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

  private async findOneWhere(
    where: SQL | undefined,
    id: string,
  ): Promise<ProductWithFinalPrice> {
    const [product] = await this.db
      .select(productColumns)
      .from(products)
      .where(where)
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.withFinalPrice(product);
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

    const conditions: SQL[] = [];
    if (forcedStatus) {
      conditions.push(eq(products.status, forcedStatus));
    }

    if (category) {
      const categoryId = await this.resolveSlugId(categories, category);
      if (!categoryId) return this.emptyPage(limit);
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (brand) {
      const brandId = await this.resolveSlugId(brands, brand);
      if (!brandId) return this.emptyPage(limit);
      conditions.push(eq(products.brandId, brandId));
    }

    if (search) {
      return this.searchProducts(search, conditions, limit);
    }

    return this.paginateProducts(sort, conditions, limit, cursor);
  }

  private async resolveSlugId(
    table: typeof categories | typeof brands,
    slug: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.slug, slug))
      .limit(1);

    return row?.id ?? null;
  }

  private emptyPage(
    limit: number,
  ): CursorPaginatedResult<ProductWithFinalPrice> {
    return { data: [], meta: { limit, hasNextPage: false, nextCursor: null } };
  }

  /**
   * Relevance ranking (ts_rank) isn't a stored column, so it can't be a
   * keyset cursor field — drizzle-pagination's cursors must be real table
   * columns. Rather than fake pagination over an unstable rank, search
   * results are a single bounded page. Deep pagination of ranked
   * full-text search is a deliberate limitation here; production search
   * at real scale reaches for dedicated infra (Elasticsearch, Algolia)
   * instead of stretching Postgres full-text search that far.
   */
  private async searchProducts(
    search: string,
    conditions: SQL[],
    limit: number,
  ): Promise<CursorPaginatedResult<ProductWithFinalPrice>> {
    const tsQuery = sql`websearch_to_tsquery('english', ${search})`;
    const rank = sql`ts_rank(${products.searchVector}, ${tsQuery})`;

    const rows = await this.db
      .select(productColumns)
      .from(products)
      .where(and(...conditions, sql`${products.searchVector} @@ ${tsQuery}`))
      .orderBy(sql`${rank} desc`, products.id)
      .limit(Math.min(limit, SEARCH_RESULT_LIMIT));

    return {
      data: rows.map((row) => this.withFinalPrice(row)),
      meta: { limit, hasNextPage: false, nextCursor: null },
    };
  }

  private async paginateProducts(
    sort: ProductSort,
    conditions: SQL[],
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
    const primaryColumn = isPriceSort ? products.price : products.createdAt;
    const primaryOrder = sort === ProductSort.PriceAsc ? 'asc' : 'desc';
    const primaryCursor = isPriceSort
      ? typeof rawPrimary === 'number'
        ? rawPrimary
        : undefined
      : typeof rawPrimary === 'string'
        ? new Date(rawPrimary)
        : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      where: conditions.length ? and(...conditions) : undefined,
      limit: limit + 1,
      cursors: [
        [primaryColumn, primaryOrder, primaryCursor],
        [products.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select(productColumns)
      .from(products)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last
        ? encodeCursor(sort, isPriceSort ? last.price : last.createdAt, last.id)
        : null;

    return {
      data: data.map((row) => this.withFinalPrice(row)),
      meta: { limit, hasNextPage, nextCursor },
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
