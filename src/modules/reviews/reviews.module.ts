// src/modules/reviews/reviews.module.ts

import { Module } from '@nestjs/common';
import { ReviewsResolver } from './graphql/reviews.resolver';
import {
  ProductReviewsController,
  ReviewsController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ProductReviewsController, ReviewsController],
  providers: [ReviewsService, ReviewsResolver],
  exports: [ReviewsService],
})
export class ReviewsModule {}
