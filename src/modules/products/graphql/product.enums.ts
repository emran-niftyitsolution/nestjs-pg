// src/modules/products/graphql/product.enums.ts

import { registerEnumType } from '@nestjs/graphql';
import { ProductSort } from '@/common/enums/product-sort.enum';
import { ProductStatus } from '@/common/enums/product-status.enum';

registerEnumType(ProductStatus, { name: 'ProductStatus' });
registerEnumType(ProductSort, { name: 'ProductSort' });
