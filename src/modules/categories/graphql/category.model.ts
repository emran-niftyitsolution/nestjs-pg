// src/modules/categories/graphql/category.model.ts

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Category')
export class CategoryModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field(() => Int)
  sortOrder!: number;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

// The service returns tree nodes with createdAt/updatedAt already stringified
// (CategoryTreeNodeDto, REST-side), so this mirrors that shape rather than
// extending CategoryModel's Date-typed fields.
@ObjectType('CategoryTreeNode')
export class CategoryTreeNodeModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field(() => Int)
  sortOrder!: number;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [CategoryTreeNodeModel])
  children!: CategoryTreeNodeModel[];
}
