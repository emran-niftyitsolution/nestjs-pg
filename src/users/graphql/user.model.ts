// src/users/graphql/user.model.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '@/common/enums/role.enum';
import '@/common/graphql/role.enum';

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  avatar!: string | null;

  @Field(() => Role)
  role!: Role;

  @Field()
  isActive!: boolean;

  @Field()
  emailVerified!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
