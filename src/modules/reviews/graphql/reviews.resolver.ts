// src/reviews/graphql/reviews.resolver.ts

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import type { ReviewRow } from '../reviews.service';
import { ReviewsService } from '../reviews.service';
import { CreateReviewInput } from './create-review.input';
import { ReviewModel, ReviewSummaryModel } from './review.model';
import { UpdateReviewInput } from './update-review.input';

const ReviewCursorPage = CursorPaginatedType(ReviewModel);

// create()/update() return Date objects (ReviewRow); the rest of this
// resolver's data comes back already stringified (ReviewResponseDto) — this
// normalizes both to the single string-dated ReviewModel shape.
function toReviewModel(
  row: Omit<ReviewRow, 'reviewerName'> & { reviewerName: string | null },
): ReviewModel {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Resolver(() => ReviewModel)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Query(() => ReviewCursorPage, { name: 'productReviews' })
  findAll(
    @Args('productId', { type: () => ID }) productId: string,
    @Args() { limit, cursor }: CursorPaginationArgs,
  ) {
    return this.reviewsService.findAllForProduct(productId, { limit, cursor });
  }

  @Public()
  @Query(() => ReviewSummaryModel, { name: 'productReviewSummary' })
  getSummary(@Args('productId', { type: () => ID }) productId: string) {
    return this.reviewsService.getSummary(productId);
  }

  @Mutation(() => ReviewModel, {
    description: 'Review a product (verified buyers only)',
  })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Args('productId', { type: () => ID }) productId: string,
    @Args('input') input: CreateReviewInput,
  ) {
    return toReviewModel(
      await this.reviewsService.create(user.id, productId, input),
    );
  }

  @Mutation(() => ReviewModel, { description: 'Edit my review' })
  async updateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateReviewInput,
  ) {
    return toReviewModel(await this.reviewsService.update(user.id, id, input));
  }

  @Mutation(() => ReviewModel, { description: 'Delete my review' })
  async removeReview(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const review = await this.reviewsService.remove(user.id, id);
    return toReviewModel({ ...review, reviewerName: null });
  }
}
