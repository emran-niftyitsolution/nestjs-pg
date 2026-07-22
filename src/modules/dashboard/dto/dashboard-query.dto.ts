// src/modules/dashboard/dto/dashboard-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const topEntitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class TopEntitiesQueryDto extends createZodDto(topEntitiesQuerySchema) {}

export const monthlySalesQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
});

export class MonthlySalesQueryDto extends createZodDto(
  monthlySalesQuerySchema,
) {}

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).default(10),
});

export class LowStockQueryDto extends createZodDto(lowStockQuerySchema) {}
