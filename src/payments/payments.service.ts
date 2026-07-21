// src/payments/payments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { DatabaseService } from '@/database/database.service';
import { orders, type Payment, payments } from '@/database/schema';
import { OrdersService } from '@/orders/orders.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { PaymentQueryDto } from './dto/payment-query.dto';
import { callMockGateway } from './mock-gateway.util';

// Same shape as Orders' — pending can resolve either way, and both
// terminal states (failed, refunded) accept no further transitions.
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.Pending]: [PaymentStatus.Success, PaymentStatus.Failed],
  [PaymentStatus.Success]: [PaymentStatus.Refunded],
  [PaymentStatus.Failed]: [],
  [PaymentStatus.Refunded]: [],
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ordersService: OrdersService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Customer pays for one of their own pending orders. Runs as one
   * transaction: recording the payment and, on success, moving the order
   * to `paid` (which fulfills inventory) commit or roll back together —
   * never a payment marked "success" against an order that's still
   * "pending" because the second half of this failed independently.
   */
  async pay(
    userId: string,
    orderId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      if (order.status !== OrderStatus.Pending) {
        throw new BadRequestException(
          `Order is already "${order.status}", not awaiting payment`,
        );
      }

      // The amount always comes from the order itself, never the client —
      // a payment for anything other than what the order actually totals
      // to would be a critical trust bug, not a feature.
      const result = callMockGateway(
        dto.provider,
        order.total,
        dto.simulateFailure ?? false,
      );

      let payment: Payment;
      try {
        [payment] = await tx
          .insert(payments)
          .values({
            orderId,
            provider: dto.provider,
            status: result.status,
            amount: order.total,
            transactionReference: result.transactionReference,
            gatewayResponse: result.gatewayResponse,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new BadRequestException(
            'This order has already been paid successfully',
          );
        }
        throw error;
      }

      if (payment.status === PaymentStatus.Success) {
        await this.ordersService.updateStatusWithTx(
          tx,
          orderId,
          OrderStatus.Paid,
        );
      }

      return payment;
    });
  }

  findAllForOrder(userId: string, orderId: string): Promise<Payment[]> {
    return this.db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        provider: payments.provider,
        status: payments.status,
        amount: payments.amount,
        transactionReference: payments.transactionReference,
        gatewayResponse: payments.gatewayResponse,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(eq(payments.orderId, orderId), eq(orders.userId, userId)))
      .orderBy(payments.createdAt);
  }

  async findAllAdmin(
    query: PaymentQueryDto,
  ): Promise<CursorPaginatedResult<Payment>> {
    const { limit, cursor, status } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const pagination = withCursorPagination({
      where: status ? eq(payments.status, status) : undefined,
      limit: limit + 1,
      cursors: [
        [payments.createdAt, 'desc', createdAtCursor],
        [payments.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(payments)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  async findOneAdmin(id: string): Promise<Payment> {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  /**
   * Admin-driven transitions: confirming a cash payment was collected
   * (pending -> success) or refunding a successful one (success ->
   * refunded). Either way, the linked order's own state machine is driven
   * through OrdersService — success finalizes inventory (reserved -> sold),
   * refund releases the order to `refunded`.
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, id))
        .limit(1);

      if (!payment) {
        throw new NotFoundException(`Payment ${id} not found`);
      }

      const allowed = ALLOWED_TRANSITIONS[payment.status];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Cannot move a payment from "${payment.status}" to "${status}"`,
        );
      }

      const [updated] = await tx
        .update(payments)
        .set({ status })
        .where(eq(payments.id, id))
        .returning();

      if (status === PaymentStatus.Success) {
        await this.ordersService.updateStatusWithTx(
          tx,
          payment.orderId,
          OrderStatus.Paid,
        );
      } else if (status === PaymentStatus.Refunded) {
        await this.ordersService.updateStatusWithTx(
          tx,
          payment.orderId,
          OrderStatus.Refunded,
        );
      }

      return updated;
    });
  }
}
