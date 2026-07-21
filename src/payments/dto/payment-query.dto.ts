// src/payments/dto/payment-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

export class PaymentQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
