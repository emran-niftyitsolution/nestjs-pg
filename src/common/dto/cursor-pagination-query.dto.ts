// src/common/dto/cursor-pagination-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const cursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z
    .string()
    .optional()
    .describe(
      "Opaque cursor from the previous response's meta.nextCursor. Omit for the first page.",
    ),
});

export class CursorPaginationQueryDto extends createZodDto(
  cursorPaginationQuerySchema,
) {}
