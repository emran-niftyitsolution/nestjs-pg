// src/common/graphql/cursor-pagination.args.ts

import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class CursorPaginationArgs {
  @Field(() => Int, { defaultValue: 20 })
  limit: number = 20;

  @Field({
    nullable: true,
    description:
      "Opaque cursor from the previous response's meta.nextCursor. Omit for the first page.",
  })
  cursor?: string;
}
