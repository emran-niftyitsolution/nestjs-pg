// src/coupons/dto/coupon-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@/common/enums/coupon-type.enum';

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: CouponType })
  type!: CouponType;

  @ApiProperty()
  value!: number;

  @ApiProperty()
  minPurchase!: number;

  @ApiPropertyOptional({ nullable: true })
  usageLimit!: number | null;

  @ApiProperty()
  usageCount!: number;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
