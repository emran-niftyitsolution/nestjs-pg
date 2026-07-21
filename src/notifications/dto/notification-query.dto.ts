// src/notifications/dto/notification-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '@/common/decorators/to-boolean.decorator';
import { CursorPaginationQueryDto } from '@/common/dto/cursor-pagination-query.dto';

export class NotificationQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only unread notifications' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  unreadOnly?: boolean;
}
