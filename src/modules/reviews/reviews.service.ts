// src/modules/reviews/reviews.service.ts

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@/common/enums/order-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import type { CreateReviewDto } from './dto/create-review.dto';
import type {
  ReviewResponseDto,
  ReviewSummaryResponseDto,
} from './dto/review-response.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';

// A purchase only "counts" once the order actually completed a sale —
// still-pending or cancelled orders never delivered anything to review.
// (Same idea CartService's stock check documents: orders reaching these
// statuses are the ones that ran through the real checkout/payment flow.)
const VERIFIED_PURCHASE_STATUSES = [
  OrderStatus.Paid,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Refunded,
];

export interface ReviewRow {
  id: string;
  productId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    productId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewRow> {
    const verified = await this.isVerifiedBuyer(userId, productId);
    if (!verified) {
      throw new ForbiddenException(
        'Only verified buyers of this product can review it',
      );
    }

    try {
      const review = await this.prisma.review.create({
        data: { productId, userId, rating: dto.rating, comment: dto.comment },
      });

      return this.findOneWithReviewer(review.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'You have already reviewed this product — edit that review instead',
        );
      }
      throw error;
    }
  }

  async findAllForProduct(
    productId: string,
    query: { limit: number; cursor?: string },
  ): Promise<CursorPaginatedResult<ReviewResponseDto>> {
    const { limit, cursor } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const { where, orderBy, take } = withCursorPagination({
      where: { productId },
      limit: limit + 1,
      cursors: [
        ['createdAt', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.review.findMany({
      where: where as Prisma.ReviewWhereInput,
      orderBy: orderBy as Prisma.ReviewOrderByWithRelationInput[],
      take,
      include: { user: { select: { firstName: true } } },
    });

    return toCursorPage(
      rows,
      limit,
      (last) => [last.createdAt, last.id],
      (row) => ({
        id: row.id,
        productId: row.productId,
        userId: row.userId,
        reviewerName: row.user.firstName,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );
  }

  /** AVG + COUNT aggregation — the PRD's textbook GROUP-free aggregate query. */
  async getSummary(productId: string): Promise<ReviewSummaryResponseDto> {
    const { _count, _avg } = await this.prisma.review.aggregate({
      where: { productId },
      _count: true,
      _avg: { rating: true },
    });

    return {
      reviewCount: _count,
      // "no reviews yet" reports null, not 0.
      averageRating: _avg.rating,
    };
  }

  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewRow> {
    const { count } = await this.prisma.review.updateMany({
      where: { id: reviewId, userId },
      data: dto,
    });

    if (count === 0) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    return this.findOneWithReviewer(reviewId);
  }

  async remove(userId: string, reviewId: string) {
    try {
      return await this.prisma.review.delete({
        where: { id: reviewId, userId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Review ${reviewId} not found`);
      }
      throw error;
    }
  }

  private async isVerifiedBuyer(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const row = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: VERIFIED_PURCHASE_STATUSES } },
      },
      select: { id: true },
    });

    return !!row;
  }

  private async findOneWithReviewer(id: string): Promise<ReviewRow> {
    const review = await this.prisma.review.findUniqueOrThrow({
      where: { id },
      include: { user: { select: { firstName: true } } },
    });

    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      reviewerName: review.user.firstName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
