// src/categories/dto/category-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';

export class CategoryQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Return only direct children of this category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Return only top-level (root) categories',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  topLevelOnly?: boolean;
}
