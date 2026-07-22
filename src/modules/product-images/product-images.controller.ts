// src/modules/product-images/product-images.controller.ts

import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { ProductImagesService } from './product-images.service';

@ApiTags('products')
@Public()
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Get()
  @ApiOperation({ summary: "Get a product's image gallery" })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiOkResponse({ type: [ProductImageResponseDto] })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productImagesService.findAllPublic(productId);
  }
}
