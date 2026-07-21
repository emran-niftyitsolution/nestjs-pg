// src/wishlist/wishlist.controller.ts

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { WishlistItemResponseDto } from './dto/wishlist-item-response.dto';
import { WishlistService } from './wishlist.service';

// Fully self-service — a user only ever manages their own wishlist.
@ApiTags('wishlist')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'List my saved products, newest first' })
  @ApiOkResponse({ type: [WishlistItemResponseDto] })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.findAllForUser(user.id);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Save a product (idempotent — re-saving is a no-op)',
  })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Product not found or not active' })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Un-save a product (idempotent — a no-op if not saved)',
  })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
