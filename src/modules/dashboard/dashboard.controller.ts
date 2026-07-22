// src/dashboard/dashboard.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import {
  LowStockQueryDto,
  MonthlySalesQueryDto,
  TopEntitiesQueryDto,
} from './dto/dashboard-query.dto';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { LowStockProductResponseDto } from './dto/low-stock-product-response.dto';
import { MonthlySalesResponseDto } from './dto/monthly-sales-response.dto';
import { TopCategoryResponseDto } from './dto/top-category-response.dto';
import { TopProductResponseDto } from './dto/top-product-response.dto';

@ApiTags('admin / dashboard')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Total revenue, orders, products, and customers' })
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Best-selling products by revenue' })
  @ApiOkResponse({ type: [TopProductResponseDto] })
  getTopProducts(@Query() query: TopEntitiesQueryDto) {
    return this.dashboardService.getTopProducts(query.limit);
  }

  @Get('top-categories')
  @ApiOperation({ summary: 'Best-selling categories by revenue' })
  @ApiOkResponse({ type: [TopCategoryResponseDto] })
  getTopCategories(@Query() query: TopEntitiesQueryDto) {
    return this.dashboardService.getTopCategories(query.limit);
  }

  @Get('monthly-sales')
  @ApiOperation({
    summary: 'Revenue and order count by month, most recent first',
  })
  @ApiOkResponse({ type: [MonthlySalesResponseDto] })
  getMonthlySales(@Query() query: MonthlySalesQueryDto) {
    return this.dashboardService.getMonthlySales(query.months);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Active products at or below a stock threshold' })
  @ApiOkResponse({ type: [LowStockProductResponseDto] })
  getLowStock(@Query() query: LowStockQueryDto) {
    return this.dashboardService.getLowStock(query.threshold);
  }
}
