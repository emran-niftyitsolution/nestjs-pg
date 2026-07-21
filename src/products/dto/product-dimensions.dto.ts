// src/products/dto/product-dimensions.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ProductDimensionsDto {
  @ApiProperty({ description: 'Length in centimeters' })
  @IsNumber()
  @Min(0)
  length!: number;

  @ApiProperty({ description: 'Width in centimeters' })
  @IsNumber()
  @Min(0)
  width!: number;

  @ApiProperty({ description: 'Height in centimeters' })
  @IsNumber()
  @Min(0)
  height!: number;
}
