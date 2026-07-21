// src/brands/graphql/brand.model.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Brand')
export class BrandModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  logoUrl!: string | null;

  @Field(() => String, { nullable: true })
  website!: string | null;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
