// src/categories/graphql/create-category.input.ts

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateCategoryInput {
  @Field()
  name!: string;

  @Field({
    nullable: true,
    description: 'URL-friendly identifier; derived from the name if omitted',
  })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ID, {
    nullable: true,
    description: 'Parent category id — omit to create a top-level category',
  })
  parentId?: string;

  @Field(() => Int, { nullable: true })
  sortOrder?: number;
}
