// src/common/graphql/cursor-paginated.type.ts

import type { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';

@ObjectType()
export class CursorPaginationMeta {
  @Field(() => Int)
  limit!: number;

  @Field()
  hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  nextCursor!: string | null;
}

/** Mirrors CursorPaginatedResponseDto (REST/Swagger) as a GraphQL object type — each item type needs its own class so the schema can name it uniquely. */
export function CursorPaginatedType<T>(
  ItemType: Type<T>,
): Type<CursorPaginatedResult<T>> {
  @ObjectType(`${ItemType.name}CursorPage`)
  abstract class CursorPaginatedTypeClass {
    @Field(() => [ItemType])
    data!: T[];

    @Field(() => CursorPaginationMeta)
    meta!: CursorPaginationMeta;
  }

  return CursorPaginatedTypeClass as Type<CursorPaginatedResult<T>>;
}
