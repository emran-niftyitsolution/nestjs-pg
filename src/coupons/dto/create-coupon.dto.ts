// src/coupons/dto/create-coupon.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CouponType } from '@/common/enums/coupon-type.enum';

export class CreateCouponDto {
  @ApiProperty({ maxLength: 50, description: 'Case-insensitive' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiProperty({
    description:
      'Percentage (0-100] if type=percentage, currency amount if type=flat — the upper bound for percentage is enforced by CouponsService, not here (a plain @Max would apply to flat coupons too)',
  })
  @IsNumber()
  @Min(0.01)
  value!: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'Omit for unlimited uses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Omit for a coupon that never expires' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
