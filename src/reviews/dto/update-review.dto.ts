// src/reviews/dto/update-review.dto.ts

import { createZodDto } from 'nestjs-zod';
import { createReviewSchema } from './create-review.dto';

export const updateReviewSchema = createReviewSchema.partial();

export class UpdateReviewDto extends createZodDto(updateReviewSchema) {}
