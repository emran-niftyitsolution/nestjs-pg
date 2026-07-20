// src/users/dto/paginated-users-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

class PaginationMetaDto {
  @ApiProperty()
  totalDocs!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  pagingCounter!: number;

  @ApiProperty()
  hasPrevPage!: boolean;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty({ nullable: true, type: Number })
  prevPage!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  nextPage!: number | null;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
