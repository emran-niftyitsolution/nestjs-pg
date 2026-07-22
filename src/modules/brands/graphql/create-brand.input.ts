// src/brands/graphql/create-brand.input.ts

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateBrandInput {
  @Field()
  name!: string;

  @Field({
    nullable: true,
    description: 'URL-friendly identifier; derived from the name if omitted',
  })
  slug?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true, description: 'URL to the brand logo image' })
  logoUrl?: string;

  @Field({ nullable: true, description: "Brand's official website" })
  website?: string;
}
