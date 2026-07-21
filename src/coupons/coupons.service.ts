// src/coupons/coupons.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { CouponType } from '@/common/enums/coupon-type.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { DatabaseService } from '@/database/database.service';
import type { DbTransaction } from '@/database/db-transaction.type';
import { type Coupon, coupons } from '@/database/schema';
import type { CouponQueryDto } from './dto/coupon-query.dto';
import type { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import type { CreateCouponDto } from './dto/create-coupon.dto';
import type { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    this.assertValueMatchesType(dto.type, dto.value);

    try {
      const [coupon] = await this.db
        .insert(coupons)
        .values({
          code: dto.code,
          type: dto.type,
          value: dto.value,
          minPurchase: dto.minPurchase ?? 0,
          usageLimit: dto.usageLimit,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        })
        .returning();

      return coupon;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A coupon with this code already exists');
      }
      throw error;
    }
  }

  async findAll(query: CouponQueryDto): Promise<CursorPaginatedResult<Coupon>> {
    const { limit, cursor, isActive } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      where:
        isActive === undefined ? undefined : eq(coupons.isActive, isActive),
      limit: limit + 1,
      cursors: [
        [coupons.createdAt, 'desc', createdAtCursor],
        [coupons.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(coupons)
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

  async findOne(id: string): Promise<Coupon> {
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    if (dto.type || dto.value !== undefined) {
      const existing = await this.findOne(id);
      this.assertValueMatchesType(
        dto.type ?? existing.type,
        dto.value ?? existing.value,
      );
    }

    try {
      const [coupon] = await this.db
        .update(coupons)
        .set({
          ...dto,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        })
        .where(eq(coupons.id, id))
        .returning();

      if (!coupon) {
        throw new NotFoundException(`Coupon ${id} not found`);
      }

      return coupon;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A coupon with this code already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Coupon> {
    const [coupon] = await this.db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning();

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    return coupon;
  }

  async validate(
    code: string,
    purchaseAmount: number,
  ): Promise<CouponValidationResponseDto> {
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(sql`upper(${coupons.code}) = upper(${code})`)
      .limit(1);

    if (!coupon) {
      throw new NotFoundException(`Coupon "${code}" not found`);
    }

    if (!coupon.isActive) {
      throw new BadRequestException('This coupon is no longer active');
    }

    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This coupon has expired');
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    if (purchaseAmount < coupon.minPurchase) {
      throw new BadRequestException(
        `This coupon requires a minimum purchase of ${coupon.minPurchase}`,
      );
    }

    const discountAmount = this.computeDiscount(coupon, purchaseAmount);
    return { coupon, discountAmount };
  }

  /**
   * Called from the checkout transaction once an order is actually placed —
   * never from validate(). The UPDATE's WHERE clause re-checks the usage
   * limit at the database level, so two concurrent checkouts racing for the
   * last use of a limited coupon can't both succeed: whichever transaction
   * commits second sees usage_count already incremented and matches zero
   * rows, which is exactly the "sold out" case checkout code must handle.
   */
  async redeem(code: string, tx?: DbTransaction): Promise<boolean> {
    const db = tx ?? this.db;
    const result = await db
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(
        sql`upper(${coupons.code}) = upper(${code})
          AND ${coupons.isActive} = true
          AND (${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`,
      )
      .returning();

    return result.length > 0;
  }

  private computeDiscount(coupon: Coupon, purchaseAmount: number): number {
    const raw =
      coupon.type === CouponType.Percentage
        ? purchaseAmount * (coupon.value / 100)
        : coupon.value;

    return Math.min(Math.round(raw * 100) / 100, purchaseAmount);
  }

  private assertValueMatchesType(type: CouponType, value: number): void {
    if (type === CouponType.Percentage && value > 100) {
      throw new BadRequestException(
        'value must not be greater than 100 for a percentage coupon',
      );
    }
  }
}
