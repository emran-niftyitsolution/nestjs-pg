// src/modules/payments/dto/payment-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

export const paymentResponseSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  provider: z.enum(PaymentProvider),
  status: z.enum(PaymentStatus),
  amount: z.number(),
  transactionReference: z.string().nullable(),
  gatewayResponse: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class PaymentResponseDto extends createZodDto(paymentResponseSchema) {}
