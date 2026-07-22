// src/modules/notifications/dto/notification-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const notificationResponseSchema = z.object({
  id: z.uuid(),
  type: z.string().describe("e.g. 'order_shipped', 'password_changed'"),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  readAt: z.iso.datetime().nullable().describe('null while unread'),
  createdAt: z.iso.datetime(),
});

export class NotificationResponseDto extends createZodDto(
  notificationResponseSchema,
) {}
