// src/modules/coupons/admin-coupons.controller.ts

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
  UseGuards,
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
import { Roles } from '@/common/decorators/roles.decorator';
import { CursorPaginatedResponseDto } from '@/common/dto/cursor-paginated-response.dto';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CouponsService } from './coupons.service';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('admin / coupons')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List coupons' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(CouponResponseDto) })
  findAll(@Query() query: CouponQueryDto) {
    return this.couponsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiCreatedResponse({ type: CouponResponseDto })
  @ApiConflictResponse({ description: 'Code already in use' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  @ApiConflictResponse({ description: 'Code already in use' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.remove(id);
  }
}
