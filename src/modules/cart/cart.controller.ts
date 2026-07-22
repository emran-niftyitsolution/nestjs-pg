// src/modules/cart/cart.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// Fully self-service — "the cart" always means the current user's own cart.
@ApiTags('cart')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart' })
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add a product to my cart (increments if already present)',
  })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found or not active' })
  @ApiBadRequestResponse({ description: 'Not enough stock' })
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Set the exact quantity of a cart line' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove a line from my cart' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty my cart' })
  @ApiOkResponse({ type: CartResponseDto })
  clearCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.id);
  }
}
