// src/products/graphql/product-query.args.ts

import { ArgsType, Field } from '@nestjs/graphql';
import { ProductSort } from '@/common/enums/product-sort.enum';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import './product.enums';

@ArgsType()
export class ProductQueryArgs extends CursorPaginationArgs {
  @Field({ nullable: true, description: 'Filter by category slug' })
  category?: string;

  @Field({ nullable: true, description: 'Filter by brand slug' })
  brand?: string;

  @Field({
    nullable: true,
    description:
      'Full-text search over name + description. When set, results are ranked by relevance and returned as a single bounded page (no cursor).',
  })
  search?: string;

  @Field(() => ProductSort, { nullable: true })
  sort?: ProductSort;
}

@ArgsType()
export class AdminProductQueryArgs extends ProductQueryArgs {
  @Field(() => ProductStatus, {
    nullable: true,
    description: 'Omit to see products in every status',
  })
  status?: ProductStatus;
}
