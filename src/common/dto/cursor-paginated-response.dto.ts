// src/common/dto/cursor-paginated-response.dto.ts

import { createZodDto, type ZodDto } from 'nestjs-zod';
import { isZodDto } from 'nestjs-zod/dto';
import { z } from 'zod';

export const cursorPaginationMetaSchema = z.object({
  limit: z.number(),
  hasNextPage: z.boolean(),
  nextCursor: z.string().nullable(),
});

export class CursorPaginationMetaDto extends createZodDto(
  cursorPaginationMetaSchema,
) {}

/**
 * A class mixin instead of a plain generic type: Swagger/nestjs-zod reads
 * OpenAPI metadata off an actual class, so each paginated response needs its
 * own runtime DTO with `data` typed to the right item schema.
 */
export function CursorPaginatedResponseDto(
  itemSchemaOrDto: z.ZodType | ZodDto,
): ZodDto {
  const itemSchema = (
    isZodDto(itemSchemaOrDto) ? itemSchemaOrDto.schema : itemSchemaOrDto
  ) as z.ZodType;

  const dtoClass = class CursorPaginatedResponseClass extends createZodDto(
    z.object({
      data: z.array(itemSchema),
      meta: cursorPaginationMetaSchema,
    }),
  ) {};

  // Swagger/nestjs-zod registers OpenAPI schemas by class name — without a
  // per-item name here, every call site would collide under the same
  // "CursorPaginatedResponseClass" name in the generated doc.
  const itemName = isZodDto(itemSchemaOrDto) ? itemSchemaOrDto.name : 'Item';
  Object.defineProperty(dtoClass, 'name', {
    value: `${itemName}CursorPage`,
  });

  return dtoClass;
}
