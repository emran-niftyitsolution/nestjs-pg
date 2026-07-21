// src/reviews/graphql/review.model.ts

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Review')
export class ReviewModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  productId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => String, {
    nullable: true,
    description:
      "The reviewer's first name — null on the removeReview payload, which doesn't carry the joined user",
  })
  reviewerName!: string | null;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  comment!: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('ReviewSummary')
export class ReviewSummaryModel {
  @Field(() => Int)
  reviewCount!: number;

  @Field(() => Float, {
    nullable: true,
    description: 'null when there are no reviews yet',
  })
  averageRating!: number | null;
}
