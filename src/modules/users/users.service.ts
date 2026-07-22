// src/modules/users/users.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from 'argon2';
import { eq, sql } from 'drizzle-orm';
import type { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';
import type { Role } from '@/common/enums/role.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { DatabaseService } from '@/database/database.service';
import { type User, users } from '@/database/schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const safeColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phone: users.phone,
  avatar: users.avatar,
  role: users.role,
  isActive: users.isActive,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export type SafeUser = Omit<typeof users.$inferSelect, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = (await argon2Hash(dto.password)) as string;

    try {
      const [user] = await this.db
        .insert(users)
        .values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: passwordHash,
          phone: dto.phone,
          avatar: dto.avatar,
        })
        .returning(safeColumns);

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  /**
   * Keyset ("cursor") pagination instead of OFFSET: newest first by
   * createdAt, with id as a unique tiebreaker so rows created in the same
   * instant still sort deterministically. We ask for one extra row so we
   * can tell whether there's a next page without a separate COUNT query —
   * that COUNT is exactly what OFFSET pagination needs and cursor
   * pagination gives up (no more "page 4 of 9"), in exchange for O(limit)
   * work per page no matter how deep you paginate.
   */
  async findAll(
    query: CursorPaginationQueryDto,
  ): Promise<CursorPaginatedResult<SafeUser>> {
    const { limit, cursor } = query;
    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      limit: limit + 1,
      cursors: [
        [users.createdAt, 'desc', createdAtCursor],
        [users.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select(safeColumns)
      .from(users)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  /**
   * Case-insensitive, matching the `lower(email)` unique index — "User@x.com"
   * must find the same account as "user@x.com" for both login and the
   * duplicate-email check in create()/update().
   * Includes the password hash — for internal use by AuthService only, never return this via a controller.
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    return user;
  }

  async findOne(id: string): Promise<SafeUser> {
    const [user] = await this.db
      .select(safeColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  /** Includes the password hash — for internal use by AuthService only, never return this via a controller. */
  async findByIdWithPassword(id: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const { password, ...rest } = dto;

    const updateData: Partial<typeof users.$inferInsert> = { ...rest };
    if (password) {
      updateData.password = (await argon2Hash(password)) as string;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    try {
      const [user] = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning(safeColumns);

      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async updateRole(id: string, role: Role): Promise<SafeUser> {
    const [user] = await this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning(safeColumns);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async remove(id: string): Promise<SafeUser> {
    const [user] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning(safeColumns);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }
}
