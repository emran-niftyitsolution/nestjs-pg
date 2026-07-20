// src/users/users.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from 'argon2';
import { count, DrizzleQueryError, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { type User, users } from '../database/schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { PaginatedResult } from './dto/paginated-result.interface';
import type { PaginationQueryDto } from './dto/pagination-query.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

const safeColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phone: users.phone,
  avatar: users.avatar,
  isActive: users.isActive,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export type SafeUser = Omit<typeof users.$inferSelect, 'password'>;

interface PostgresErrorLike {
  code: string;
}

function hasPostgresErrorCode(error: unknown): error is PostgresErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof DrizzleQueryError &&
    hasPostgresErrorCode(error.cause) &&
    error.cause.code === POSTGRES_UNIQUE_VIOLATION
  );
}

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

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<SafeUser>> {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select(safeColumns)
        .from(users)
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(users),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      data,
      meta: {
        totalDocs: total,
        limit,
        page,
        totalPages,
        pagingCounter: offset + 1,
        hasPrevPage,
        hasNextPage,
        prevPage: hasPrevPage ? page - 1 : null,
        nextPage: hasNextPage ? page + 1 : null,
      },
    };
  }

  /** Includes the password hash — for internal use by AuthService only, never return this via a controller. */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
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
