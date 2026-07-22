// src/modules/orders/admin-orders.controller.ts

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
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('admin / orders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(OrderResponseDto) })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get any order by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Move an order to a new status (validated against its state machine)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({
    description:
      'That status transition is not allowed from the current status',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
