// src/common/dto/message-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const messageResponseSchema = z.object({
  message: z.string(),
});

export class MessageResponseDto extends createZodDto(messageResponseSchema) {}
