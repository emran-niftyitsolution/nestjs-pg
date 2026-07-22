// src/modules/payments/dto/payment-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

export const paymentQuerySchema = cursorPaginationQuerySchema.extend({
  status: z.enum(PaymentStatus).optional(),
});

export class PaymentQueryDto extends createZodDto(paymentQuerySchema) {}
