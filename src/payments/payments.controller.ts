// src/payments/payments.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

// Fully self-service — a customer only ever pays for and views payments on
// their own orders. Nested under /orders/:orderId since a payment is
// meaningless without the order it's for.
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('orders/:orderId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Pay for one of my pending orders' })
  @ApiParam({ name: 'orderId', format: 'uuid' })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({
    description: 'Order is not awaiting payment, or already paid',
  })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.pay(user.id, orderId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payment attempts for one of my orders' })
  @ApiParam({ name: 'orderId', format: 'uuid' })
  @ApiOkResponse({ type: [PaymentResponseDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.findAllForOrder(user.id, orderId);
  }
}
