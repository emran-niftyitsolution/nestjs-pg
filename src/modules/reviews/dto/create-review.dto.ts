// src/modules/reviews/dto/create-review.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export class CreateReviewDto extends createZodDto(createReviewSchema) {}
