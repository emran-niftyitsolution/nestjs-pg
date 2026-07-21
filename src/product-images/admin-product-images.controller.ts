// src/product-images/admin-product-images.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImagesService } from './product-images.service';

@ApiTags('admin / products')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@Controller('admin/products/:productId/images')
export class AdminProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Get()
  @ApiOperation({ summary: "Get a product's image gallery, in any status" })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: [ProductImageResponseDto] })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productImagesService.findAllAdmin(productId);
  }

  @Post()
  @ApiOperation({ summary: 'Add an image to a product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiCreatedResponse({ type: ProductImageResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productImagesService.create(productId, dto);
  }

  @Patch(':imageId')
  @ApiOperation({ summary: "Update an image's alt text, url, or sort order" })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiOkResponse({ type: ProductImageResponseDto })
  @ApiNotFoundResponse({ description: 'Image not found on this product' })
  update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(productId, imageId, dto);
  }

  @Delete(':imageId')
  @ApiOperation({ summary: 'Remove an image from a product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiOkResponse({ type: ProductImageResponseDto })
  @ApiNotFoundResponse({ description: 'Image not found on this product' })
  remove(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productImagesService.remove(productId, imageId);
  }
}
