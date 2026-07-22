// src/modules/orders/orders.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CursorPaginatedResponseDto } from '@/common/dto/cursor-paginated-response.dto';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

// Fully self-service — a customer only ever sees and acts on their own orders.
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Place an order from my current cart' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Cart is empty, a product is unavailable/out of stock, or the coupon is invalid',
  })
  @ApiNotFoundResponse({ description: 'Address not found' })
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my orders, newest first' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(OrderResponseDto) })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findAllForUser(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my orders' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOneForUser(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel one of my orders (only while still pending)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Order is no longer pending' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelOwnOrder(user.id, id);
  }
}
