// src/orders/dto/order-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';
import { OrderStatus } from '@/common/enums/order-status.enum';

export class OrderQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
