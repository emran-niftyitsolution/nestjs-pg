// src/product-images/graphql/update-product-image.input.ts

import { InputType, PartialType } from '@nestjs/graphql';
import { CreateProductImageInput } from './create-product-image.input';

@InputType()
export class UpdateProductImageInput extends PartialType(
  CreateProductImageInput,
) {}
