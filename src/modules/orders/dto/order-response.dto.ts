// src/modules/orders/dto/order-response.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrderStatus } from '@/common/enums/order-status.enum';

export const shippingAddressSnapshotSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export class ShippingAddressSnapshotDto extends createZodDto(
  shippingAddressSnapshotSchema,
) {}

export const orderItemResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  productSku: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  taxAmount: z.number(),
  lineTotal: z.number(),
});

export class OrderItemResponseDto extends createZodDto(
  orderItemResponseSchema,
) {}

export const orderResponseSchema = z.object({
  id: z.uuid(),
  status: z.enum(OrderStatus),
  subtotal: z.number(),
  discountAmount: z.number(),
  couponCode: z.string().nullable(),
  shippingAddress: shippingAddressSnapshotSchema,
  total: z.number(),
  items: z.array(orderItemResponseSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class OrderResponseDto extends createZodDto(orderResponseSchema) {}
