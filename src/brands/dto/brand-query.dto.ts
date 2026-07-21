// src/brands/dto/brand-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '@/common/decorators/to-boolean.decorator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';

export class BrandQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
