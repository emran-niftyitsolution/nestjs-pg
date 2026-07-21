// src/coupons/dto/validate-coupon.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({
    minimum: 0,
    description: "The order's subtotal before discount",
  })
  @IsNumber()
  @Min(0)
  purchaseAmount!: number;
}
