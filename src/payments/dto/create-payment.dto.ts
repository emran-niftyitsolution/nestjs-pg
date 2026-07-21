// src/payments/dto/create-payment.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';

export const createPaymentSchema = z.object({
  provider: z.enum(PaymentProvider),
  simulateFailure: z
    .boolean()
    .optional()
    .describe(
      'Mock-only: force the simulated gateway call to fail, so the failure path can be exercised deterministically instead of leaving it untestable.',
    ),
});

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
