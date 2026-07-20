// src/auth/dto/token-pair-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class TokenPairResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}
