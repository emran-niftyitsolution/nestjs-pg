// src/categories/categories.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, isNull, sql } from 'drizzle-orm';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/postgres-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { DatabaseService } from '@/database/database.service';
import { type Category, categories } from '@/database/schema';
import type { CategoryQueryDto } from './dto/category-query.dto';
import type { CategoryTreeNodeDto } from './dto/category-tree-node.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

interface CategoryTreeRow extends Category {
  depth: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? slugify(dto.name);

    try {
      const [category] = await this.db
        .insert(categories)
        .values({
          name: dto.name,
          slug,
          description: dto.description,
          parentId: dto.parentId,
          sortOrder: dto.sortOrder ?? 0,
        })
        .returning();

      return category;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A category with this slug already exists');
      }
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(
          `Parent category ${dto.parentId} not found`,
        );
      }
      throw error;
    }
  }

  /** Keyset pagination ordered by sortOrder (the admin-controlled display order), id as the unique tiebreaker. */
  async findAll(
    query: CategoryQueryDto,
  ): Promise<CursorPaginatedResult<Category>> {
    const { limit, cursor, parentId, topLevelOnly } = query;

    const filterWhere = topLevelOnly
      ? isNull(categories.parentId)
      : parentId
        ? eq(categories.parentId, parentId)
        : undefined;

    const [rawSortOrder, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const sortOrderCursor =
      typeof rawSortOrder === 'number' ? rawSortOrder : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      where: filterWhere,
      limit: limit + 1,
      cursors: [
        [categories.sortOrder, 'asc', sortOrderCursor],
        [categories.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(categories)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.sortOrder, last.id) : null;

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  async findOne(id: string): Promise<Category> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  /**
   * The whole forest. One flat, non-recursive query — cheaper than a
   * recursive CTE here because we're fetching every row anyway — nested
   * into a tree in application code afterwards.
   */
  async findTree(): Promise<CategoryTreeNodeDto[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder, categories.name);

    return this.nest(rows, null);
  }

  /**
   * The subtree rooted at `id`. This is where a recursive CTE actually earns
   * its keep: it walks DOWN from one starting row through `parent_id` joins,
   * so only the relevant branch is ever touched — not the whole table.
   */
  async findDescendants(id: string): Promise<CategoryTreeNodeDto[]> {
    await this.findOne(id);

    const rows = (await this.db.execute(sql`
      WITH RECURSIVE subtree AS (
        SELECT id, parent_id, name, slug, description, sort_order, is_active, created_at, updated_at, 0 AS depth
        FROM categories
        WHERE id = ${id}
        UNION ALL
        SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.sort_order, c.is_active, c.created_at, c.updated_at, subtree.depth + 1
        FROM categories c
        INNER JOIN subtree ON c.parent_id = subtree.id
      )
      SELECT id, name, slug, description, parent_id AS "parentId", sort_order AS "sortOrder",
             is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt", depth
      FROM subtree
      WHERE id <> ${id}
      ORDER BY depth, sort_order
    `)) as unknown as CategoryTreeRow[];

    const plainRows: Category[] = rows.map(
      ({ depth: _depth, ...rest }) => rest,
    );
    return this.nest(plainRows, id);
  }

  /**
   * The breadcrumb path from the root down to (but excluding) `id`. Same
   * recursive-CTE shape as `findDescendants`, just walking UP the
   * `parent_id` chain instead of down.
   */
  async findAncestors(id: string): Promise<Category[]> {
    await this.findOne(id);

    const rows = (await this.db.execute(sql`
      WITH RECURSIVE ancestry AS (
        SELECT id, parent_id, name, slug, description, sort_order, is_active, created_at, updated_at, 0 AS depth
        FROM categories
        WHERE id = ${id}
        UNION ALL
        SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.sort_order, c.is_active, c.created_at, c.updated_at, ancestry.depth + 1
        FROM categories c
        INNER JOIN ancestry ON ancestry.parent_id = c.id
      )
      SELECT id, name, slug, description, parent_id AS "parentId", sort_order AS "sortOrder",
             is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt", depth
      FROM ancestry
      WHERE id <> ${id}
      ORDER BY depth DESC
    `)) as unknown as CategoryTreeRow[];

    return rows.map(({ depth: _depth, ...rest }) => rest);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      await this.assertValidParent(id, dto.parentId);
    }

    try {
      const [category] = await this.db
        .update(categories)
        .set(dto)
        .where(eq(categories.id, id))
        .returning();

      if (!category) {
        throw new NotFoundException(`Category ${id} not found`);
      }

      return category;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A category with this slug already exists');
      }
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(
          `Parent category ${dto.parentId} not found`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Category> {
    try {
      const [category] = await this.db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();

      if (!category) {
        throw new NotFoundException(`Category ${id} not found`);
      }

      return category;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Cannot delete a category that still has subcategories',
        );
      }
      throw error;
    }
  }

  /** Rejects re-parenting a category onto itself or onto one of its own descendants (which would create a cycle). */
  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) {
      throw new ConflictException('A category cannot be its own parent');
    }

    const descendantIds = await this.getDescendantIds(id);
    if (descendantIds.has(parentId)) {
      throw new ConflictException(
        'Cannot move a category under its own descendant',
      );
    }
  }

  private async getDescendantIds(id: string): Promise<Set<string>> {
    const rows = (await this.db.execute(sql`
      WITH RECURSIVE subtree AS (
        SELECT id, parent_id FROM categories WHERE id = ${id}
        UNION ALL
        SELECT c.id, c.parent_id FROM categories c INNER JOIN subtree ON c.parent_id = subtree.id
      )
      SELECT id FROM subtree WHERE id <> ${id}
    `)) as unknown as Array<{ id: string }>;

    return new Set(rows.map((row) => row.id));
  }

  /** Groups flat rows by parentId once (O(n)), then recursively attaches children starting from `rootParentId`. */
  private nest(
    rows: Category[],
    rootParentId: string | null,
  ): CategoryTreeNodeDto[] {
    const childrenByParent = new Map<string | null, Category[]>();
    for (const row of rows) {
      const bucket = childrenByParent.get(row.parentId) ?? [];
      bucket.push(row);
      childrenByParent.set(row.parentId, bucket);
    }

    const attach = (parentId: string | null): CategoryTreeNodeDto[] =>
      (childrenByParent.get(parentId) ?? []).map((row) => ({
        ...row,
        children: attach(row.id),
      }));

    return attach(rootParentId);
  }
}
