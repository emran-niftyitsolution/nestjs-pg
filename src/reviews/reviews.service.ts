// src/reviews/reviews.service.ts

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, avg, count, eq, inArray } from 'drizzle-orm';
import { OrderStatus } from '@/common/enums/order-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { DatabaseService } from '@/database/database.service';
import {
  orderItems,
  orders,
  type Review,
  reviews,
  users,
} from '@/database/schema';
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
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

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
      const [review] = await this.db
        .insert(reviews)
        .values({ productId, userId, rating: dto.rating, comment: dto.comment })
        .returning();

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

    const pagination = withCursorPagination({
      where: eq(reviews.productId, productId),
      limit: limit + 1,
      cursors: [
        [reviews.createdAt, 'desc', createdAtCursor],
        [reviews.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        reviewerName: users.firstName,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null;

    return {
      data: data.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: { limit, hasNextPage, nextCursor },
    };
  }

  /** AVG + COUNT aggregation — the PRD's textbook GROUP-free aggregate query. */
  async getSummary(productId: string): Promise<ReviewSummaryResponseDto> {
    const [row] = await this.db
      .select({ reviewCount: count(), averageRating: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    return {
      reviewCount: row.reviewCount,
      // Postgres's avg() over an integer column returns a numeric, which
      // the driver hands back as a string — Number(null) is 0, not what
      // "no reviews yet" should report, so that case is kept as null.
      averageRating:
        row.averageRating === null ? null : Number(row.averageRating),
    };
  }

  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewRow> {
    const [review] = await this.db
      .update(reviews)
      .set(dto)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .returning();

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    return this.findOneWithReviewer(review.id);
  }

  async remove(userId: string, reviewId: string): Promise<Review> {
    const [review] = await this.db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .returning();

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    return review;
  }

  private async isVerifiedBuyer(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orderItems.productId, productId),
          inArray(orders.status, VERIFIED_PURCHASE_STATUSES),
        ),
      )
      .limit(1);

    return !!row;
  }

  private async findOneWithReviewer(id: string): Promise<ReviewRow> {
    const [row] = await this.db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        reviewerName: users.firstName,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.id, id))
      .limit(1);

    return row;
  }
}
