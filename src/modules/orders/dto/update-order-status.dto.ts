// src/modules/orders/dto/update-order-status.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrderStatus } from '@/common/enums/order-status.enum';

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatus),
});

export class UpdateOrderStatusDto extends createZodDto(
  updateOrderStatusSchema,
) {}
