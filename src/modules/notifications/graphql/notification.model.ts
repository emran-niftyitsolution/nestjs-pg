// src/modules/notifications/graphql/notification.model.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('Notification')
export class NotificationModel {
  @Field(() => ID)
  id!: string;

  @Field({ description: "e.g. 'order_shipped', 'password_changed'" })
  type!: string;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata!: Record<string, unknown> | null;

  @Field(() => Date, { nullable: true, description: 'null while unread' })
  readAt!: Date | null;

  @Field()
  createdAt!: Date;
}
