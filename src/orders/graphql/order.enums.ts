// src/orders/graphql/order.enums.ts

import { registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from '@/common/enums/order-status.enum';

registerEnumType(OrderStatus, { name: 'OrderStatus' });
