// src/reviews/dto/review-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: "The reviewer's first name" })
  reviewerName!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating!: number;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ReviewSummaryResponseDto {
  @ApiProperty()
  reviewCount!: number;

  @ApiProperty({
    nullable: true,
    description: 'null when there are no reviews yet',
  })
  averageRating!: number | null;
}
