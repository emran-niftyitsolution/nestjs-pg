// src/orders/dto/order-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorPaginationQuerySchema } from '@/common/dto/cursor-pagination-query.dto';
import { OrderStatus } from '@/common/enums/order-status.enum';

export const orderQuerySchema = cursorPaginationQuerySchema.extend({
  status: z.enum(OrderStatus).optional(),
});

export class OrderQueryDto extends createZodDto(orderQuerySchema) {}
