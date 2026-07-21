// src/reviews/reviews.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CursorPaginatedResponseDto } from '@/common/dto/cursor-paginated-response.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import {
  ReviewResponseDto,
  ReviewSummaryResponseDto,
} from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('products')
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List reviews for a product (public)' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(ReviewResponseDto) })
  findAll(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findAllForProduct(productId, query);
  }

  @Get('summary')
  @Public()
  @ApiOperation({ summary: 'Average rating and review count for a product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: ReviewSummaryResponseDto })
  getSummary(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewsService.getSummary(productId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a product (verified buyers only)' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiForbiddenResponse({ description: "You haven't purchased this product" })
  @ApiConflictResponse({ description: 'You already reviewed this product' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.id, productId, dto);
  }
}

// Editing/deleting a review isn't scoped by product in the URL — the
// review id alone (plus ownership) is enough.
@ApiTags('reviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit my review' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Review not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my review' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Review not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewsService.remove(user.id, id);
  }
}
