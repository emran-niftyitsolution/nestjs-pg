// src/notifications/dto/notification-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: "e.g. 'order_shipped', 'password_changed'" })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true, description: 'null while unread' })
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
