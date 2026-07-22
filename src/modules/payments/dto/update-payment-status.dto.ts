// src/payments/dto/update-payment-status.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

export const updatePaymentStatusSchema = z.object({
  status: z.enum(PaymentStatus),
});

export class UpdatePaymentStatusDto extends createZodDto(
  updatePaymentStatusSchema,
) {}
