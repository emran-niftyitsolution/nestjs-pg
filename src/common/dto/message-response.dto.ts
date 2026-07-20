// src/common/dto/message-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
