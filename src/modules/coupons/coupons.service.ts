// src/modules/coupons/coupons.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponType } from '@/common/enums/coupon-type.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import type { DbTransaction } from '@/database/db-transaction.type';
import { PrismaService } from '@/database/prisma.service';
import { type Coupon, Prisma } from '@/generated/prisma/client';
import type { CouponQueryDto } from './dto/coupon-query.dto';
import type { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import type { CreateCouponDto } from './dto/create-coupon.dto';
import type { UpdateCouponDto } from './dto/update-coupon.dto';

// Coupon.value/minPurchase are Prisma Decimal on read, and Coupon.type is
// Prisma's generated (nominally distinct) CouponType — the API contract
// (CouponResponseDto) is plain numbers and this module's own CouponType
// enum, so every outward-facing coupon is converted at this boundary
// rather than leaking Decimal/generated-enum values out.
export type CouponDto = Omit<Coupon, 'value' | 'minPurchase' | 'type'> & {
  value: number;
  minPurchase: number;
  type: CouponType;
};

function toCouponDto(coupon: Coupon): CouponDto {
  return {
    ...coupon,
    type: coupon.type as CouponType,
    value: coupon.value.toNumber(),
    minPurchase: coupon.minPurchase.toNumber(),
  };
}

const COUPON_COLUMNS_SQL = Prisma.sql`
  id, code, type, value::float8 AS value, min_purchase::float8 AS "minPurchase",
  usage_limit AS "usageLimit", usage_count AS "usageCount",
  expires_at AS "expiresAt", is_active AS "isActive",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto): Promise<CouponDto> {
    this.assertValueMatchesType(dto.type, dto.value);

    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          code: dto.code,
          type: dto.type,
          value: dto.value,
          minPurchase: dto.minPurchase ?? 0,
          usageLimit: dto.usageLimit,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });

      return toCouponDto(coupon);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A coupon with this code already exists');
      }
      throw error;
    }
  }

  async findAll(
    query: CouponQueryDto,
  ): Promise<CursorPaginatedResult<CouponDto>> {
    const { limit, cursor, isActive } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const { where, orderBy, take } = withCursorPagination({
      where: isActive === undefined ? undefined : { isActive },
      limit: limit + 1,
      cursors: [
        ['createdAt', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.coupon.findMany({
      where: where as Prisma.CouponWhereInput,
      orderBy: orderBy as Prisma.CouponOrderByWithRelationInput[],
      take,
    });

    return toCursorPage(
      rows,
      limit,
      (last) => [last.createdAt, last.id],
      toCouponDto,
    );
  }

  async findOne(id: string): Promise<CouponDto> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    return toCouponDto(coupon);
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponDto> {
    if (dto.type || dto.value !== undefined) {
      const existing = await this.findOne(id);
      this.assertValueMatchesType(
        dto.type ?? existing.type,
        dto.value ?? existing.value,
      );
    }

    try {
      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: {
          ...dto,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });

      return toCouponDto(coupon);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A coupon with this code already exists');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Coupon ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<CouponDto> {
    try {
      const coupon = await this.prisma.coupon.delete({ where: { id } });
      return toCouponDto(coupon);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Coupon ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Raw SQL to hit the `upper(code)` unique functional index directly —
   * same reasoning as UsersService.findByEmail: Prisma's `mode:
   * 'insensitive'` compiles to ILIKE, which wouldn't use that index.
   */
  async validate(
    code: string,
    purchaseAmount: number,
  ): Promise<CouponValidationResponseDto> {
    const [coupon] = await this.prisma.$queryRaw<CouponDto[]>(Prisma.sql`
      SELECT ${COUPON_COLUMNS_SQL}
      FROM coupons
      WHERE upper(code) = upper(${code})
      LIMIT 1
    `);

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
    return {
      coupon: {
        ...coupon,
        expiresAt: coupon.expiresAt?.toISOString() ?? null,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
      discountAmount,
    };
  }

  /**
   * Called from the checkout transaction once an order is actually placed —
   * never from validate(). The UPDATE's WHERE clause re-checks the usage
   * limit at the database level, so two concurrent checkouts racing for the
   * last use of a limited coupon can't both succeed: whichever transaction
   * commits second sees usage_count already incremented and matches zero
   * rows, which is exactly the "sold out" case checkout code must handle.
   * Raw SQL because comparing usage_count to usage_limit (column-to-column)
   * isn't expressible in Prisma's filter DSL.
   */
  async redeem(code: string, tx?: DbTransaction): Promise<boolean> {
    const client = tx ?? this.prisma;
    const result = await client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE coupons
      SET usage_count = usage_count + 1
      WHERE upper(code) = upper(${code})
        AND is_active = true
        AND (usage_limit IS NULL OR usage_count < usage_limit)
      RETURNING id
    `);

    return result.length > 0;
  }

  private computeDiscount(coupon: CouponDto, purchaseAmount: number): number {
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
