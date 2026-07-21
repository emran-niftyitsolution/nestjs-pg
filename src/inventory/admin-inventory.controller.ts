// src/inventory/admin-inventory.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { InventoryService } from './inventory.service';

@ApiTags('admin / inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Get stock/reserved/sold levels for a product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  getSummary(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getSummary(productId);
  }
}
