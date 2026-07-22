// src/reviews/dto/review-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const reviewResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  userId: z.uuid(),
  reviewerName: z.string().describe("The reviewer's first name"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ReviewResponseDto extends createZodDto(reviewResponseSchema) {}

export const reviewSummaryResponseSchema = z.object({
  reviewCount: z.number(),
  averageRating: z
    .number()
    .nullable()
    .describe('null when there are no reviews yet'),
});

export class ReviewSummaryResponseDto extends createZodDto(
  reviewSummaryResponseSchema,
) {}
