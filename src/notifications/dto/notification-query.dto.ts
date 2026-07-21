// src/notifications/dto/notification-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { booleanQuerySchema } from '@/common/utils/zod-boolean-query.util';

export const notificationQuerySchema = cursorPaginationQuerySchema.extend({
  unreadOnly: booleanQuerySchema()
    .optional()
    .describe('Only unread notifications'),
});

export class NotificationQueryDto extends createZodDto(
  notificationQuerySchema,
) {}
