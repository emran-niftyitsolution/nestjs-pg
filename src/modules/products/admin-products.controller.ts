// src/modules/products/admin-products.controller.ts

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
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('admin / products')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products in any status' })
  @ApiOkResponse({ type: CursorPaginatedResponseDto(ProductResponseDto) })
  findAll(@Query() query: AdminProductQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id, in any status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiConflictResponse({ description: 'Slug or SKU already in use' })
  @ApiNotFoundResponse({ description: 'Category or brand not found' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product, category, or brand not found' })
  @ApiConflictResponse({ description: 'Slug or SKU already in use' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
