// src/modules/payments/payments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import { isUniqueViolation } from '@/common/utils/postgres-error.util';
import { PrismaService } from '@/database/prisma.service';
import { type Payment, Prisma } from '@/generated/prisma/client';
import { OrdersService } from '@/modules/orders/orders.service';
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

// Payment.amount is Prisma Decimal on read — the API contract is a plain
// number, converted once at this boundary.
export type PaymentDto = Omit<Payment, 'amount'> & { amount: number };

function toPaymentDto(payment: Payment): PaymentDto {
  return { ...payment, amount: payment.amount.toNumber() };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

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
  ): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
      });

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
        order.total.toNumber(),
        dto.simulateFailure ?? false,
      );

      let payment: Payment;
      try {
        payment = await tx.payment.create({
          data: {
            orderId,
            provider: dto.provider,
            status: result.status,
            amount: order.total,
            transactionReference: result.transactionReference,
            gatewayResponse: result.gatewayResponse as Prisma.InputJsonValue,
          },
        });
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

      return toPaymentDto(payment);
    });
  }

  async findAllForOrder(
    userId: string,
    orderId: string,
  ): Promise<PaymentDto[]> {
    const rows = await this.prisma.payment.findMany({
      where: { orderId, order: { userId } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(toPaymentDto);
  }

  async findAllAdmin(
    query: PaymentQueryDto,
  ): Promise<CursorPaginatedResult<PaymentDto>> {
    const { limit, cursor, status } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const { where, orderBy, take } = withCursorPagination({
      where: status ? { status } : undefined,
      limit: limit + 1,
      cursors: [
        ['createdAt', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.payment.findMany({
      where: where as Prisma.PaymentWhereInput,
      orderBy: orderBy as Prisma.PaymentOrderByWithRelationInput[],
      take,
    });

    return toCursorPage(
      rows,
      limit,
      (last) => [last.createdAt, last.id],
      toPaymentDto,
    );
  }

  async findOneAdmin(id: string): Promise<PaymentDto> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return toPaymentDto(payment);
  }

  /**
   * Admin-driven transitions: confirming a cash payment was collected
   * (pending -> success) or refunding a successful one (success ->
   * refunded). Either way, the linked order's own state machine is driven
   * through OrdersService — success finalizes inventory (reserved -> sold),
   * refund releases the order to `refunded`.
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<PaymentDto> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id } });

      if (!payment) {
        throw new NotFoundException(`Payment ${id} not found`);
      }

      const allowed = ALLOWED_TRANSITIONS[payment.status];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Cannot move a payment from "${payment.status}" to "${status}"`,
        );
      }

      const updated = await tx.payment.update({
        where: { id },
        data: { status },
      });

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

      return toPaymentDto(updated);
    });
  }
}
