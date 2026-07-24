// src/modules/users/users.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash as argon2Hash } from 'argon2';
import type { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';
import type { Role } from '@/common/enums/role.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, type User } from '@/generated/prisma/client';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const safeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = (await argon2Hash(dto.password)) as string;

    try {
      return await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: passwordHash,
          phone: dto.phone,
          avatar: dto.avatar,
        },
        select: safeSelect,
      });
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

    const { where, orderBy, take } = withCursorPagination({
      limit: limit + 1,
      cursors: [
        ['createdAt', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.user.findMany({
      where: where as Prisma.UserWhereInput,
      orderBy: orderBy as Prisma.UserOrderByWithRelationInput[],
      take,
      select: safeSelect,
    });

    return toCursorPage(rows, limit, (last) => [last.createdAt, last.id]);
  }

  /**
   * Case-insensitive, matching the `lower(email)` unique index — "User@x.com"
   * must find the same account as "user@x.com" for both login and the
   * duplicate-email check in create()/update(). Raw SQL because this needs
   * to hit that functional index directly (Prisma's `mode: 'insensitive'`
   * compiles to ILIKE, which won't use a `lower(email)` expression index).
   * Includes the password hash — for internal use by AuthService only, never return this via a controller.
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.prisma.$queryRaw<User[]>(Prisma.sql`
      SELECT id, first_name AS "firstName", last_name AS "lastName", email,
             password, phone, avatar, role, is_active AS "isActive",
             email_verified AS "emailVerified",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE lower(email) = lower(${email})
      LIMIT 1
    `);

    return user;
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeSelect,
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  /** Includes the password hash — for internal use by AuthService only, never return this via a controller. */
  async findByIdWithPassword(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const { password, ...rest } = dto;

    const updateData: Prisma.UserUpdateInput = { ...rest };
    if (password) {
      updateData.password = (await argon2Hash(password)) as string;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: safeSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (isUniqueViolation(error)) {
          throw new ConflictException('Email is already in use');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`User ${id} not found`);
        }
      }
      throw error;
    }
  }

  async updateRole(id: string, role: Role): Promise<SafeUser> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { role },
        select: safeSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<SafeUser> {
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: safeSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }
}
