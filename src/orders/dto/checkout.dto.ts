// src/orders/dto/checkout.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({
    format: 'uuid',
    description: 'One of your own addresses to ship to',
  })
  @IsUUID()
  addressId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}
