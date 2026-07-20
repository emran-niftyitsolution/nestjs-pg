// src/categories/dto/category-tree-node.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto';

export class CategoryTreeNodeDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeNodeDto] })
  children!: CategoryTreeNodeDto[];
}
