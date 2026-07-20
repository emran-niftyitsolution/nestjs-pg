// src/common/dto/cursor-paginated-response.dto.ts

import type { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationMetaDto {
  @ApiProperty()
  limit!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

/**
 * A class mixin instead of a plain generic type: Swagger reads decorator
 * metadata off an actual class, so each paginated response needs its own
 * runtime class with `data` typed to the right item DTO.
 */
export function CursorPaginatedResponseDto<T>(ItemDto: Type<T>): Type<{
  data: T[];
  meta: CursorPaginationMetaDto;
}> {
  class CursorPaginatedResponseClass {
    @ApiProperty({ type: [ItemDto] })
    data!: T[];

    @ApiProperty({ type: CursorPaginationMetaDto })
    meta!: CursorPaginationMetaDto;
  }

  return CursorPaginatedResponseClass;
}
