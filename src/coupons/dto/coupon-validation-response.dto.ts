// src/coupons/dto/coupon-validation-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { CouponResponseDto } from './coupon-response.dto';

export class CouponValidationResponseDto {
  @ApiProperty({ type: CouponResponseDto })
  coupon!: CouponResponseDto;

  @ApiProperty({ description: 'Amount to subtract from purchaseAmount' })
  discountAmount!: number;
}
