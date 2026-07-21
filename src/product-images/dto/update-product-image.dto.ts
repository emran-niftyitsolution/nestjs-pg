// src/product-images/dto/update-product-image.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateProductImageDto } from './create-product-image.dto';

export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {}
