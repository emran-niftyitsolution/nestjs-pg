// src/reviews/dto/review-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';

export const reviewQuerySchema = cursorPaginationQuerySchema;

export class ReviewQueryDto extends createZodDto(reviewQuerySchema) {}
