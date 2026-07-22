// src/modules/payments/admin-payments.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CursorPaginatedResponseDto } from '@/common/dto/cursor-paginated-response.dto';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

@ApiTags('admin / payments')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(PaymentResponseDto) })
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOneAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Move a payment to a new status',
    description:
      'e.g. confirm a cash payment was collected (pending -> success), or refund a successful one (success -> refunded). Drives the linked order through the same transition.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  @ApiBadRequestResponse({
    description:
      'That status transition is not allowed from the current status',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, dto.status);
  }
}
