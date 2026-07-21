// src/reviews/graphql/create-review.input.ts

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateReviewInput {
  @Field(() => Int)
  rating!: number;

  @Field({ nullable: true })
  comment?: string;
}
