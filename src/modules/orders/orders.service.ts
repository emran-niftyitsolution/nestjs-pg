// src/modules/orders/orders.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { ProductStatus } from '@/common/enums/product-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import type { DbTransaction } from '@/database/db-transaction.type';
import { PrismaService } from '@/database/prisma.service';
import {
  Prisma,
  type Order as PrismaOrder,
  type OrderItem as PrismaOrderItem,
} from '@/generated/prisma/client';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import type { CheckoutDto } from './dto/checkout.dto';
import type { OrderQueryDto } from './dto/order-query.dto';
import type {
  OrderResponseDto,
  ShippingAddressSnapshotDto,
} from './dto/order-response.dto';

// Which statuses a given status may move to. Anything not listed here
// (including every terminal state) accepts no further transitions.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [
    OrderStatus.Processing,
    OrderStatus.Cancelled,
    OrderStatus.Refunded,
  ],
  [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Refunded],
  [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Refunded],
  [OrderStatus.Delivered]: [OrderStatus.Refunded],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Refunded]: [],
};

const NOTIFICATION_FOR_STATUS: Partial<
  Record<
    OrderStatus,
    { type: NotificationType; title: string; message: string }
  >
> = {
  [OrderStatus.Shipped]: {
    type: NotificationType.OrderShipped,
    title: 'Your order has shipped',
    message: 'is on its way.',
  },
  [OrderStatus.Delivered]: {
    type: NotificationType.OrderDelivered,
    title: 'Your order has been delivered',
    message: 'has been delivered.',
  },
  [OrderStatus.Cancelled]: {
    type: NotificationType.OrderCancelled,
    title: 'Your order was cancelled',
    message: 'was cancelled.',
  },
  [OrderStatus.Refunded]: {
    type: NotificationType.OrderRefunded,
    title: 'Your order was refunded',
    message: 'was refunded.',
  },
};

// Order.subtotal/discountAmount/total and OrderItem.unitPrice/taxAmount/
// lineTotal are Prisma Decimal on read — every internal representation past
// this point is plain numbers, converted once at the point each row comes
// back from Prisma Client (toOrderRow/toOrderItemRow) or cast directly to
// ::float8 in the raw-SQL cursor-pagination path (queryOrders).
interface OrderRow {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingAddress: Prisma.JsonValue;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  taxAmount: number;
  lineTotal: number;
  createdAt: Date;
}

function toOrderRow(order: PrismaOrder): OrderRow {
  return {
    ...order,
    status: order.status as OrderStatus,
    subtotal: order.subtotal.toNumber(),
    discountAmount: order.discountAmount.toNumber(),
    total: order.total.toNumber(),
  };
}

function toOrderItemRow(item: PrismaOrderItem): OrderItemRow {
  return {
    ...item,
    unitPrice: item.unitPrice.toNumber(),
    taxAmount: item.taxAmount.toNumber(),
    lineTotal: item.lineTotal.toNumber(),
  };
}

const ORDER_COLUMNS_SQL = Prisma.sql`
  id, user_id AS "userId", status,
  subtotal::float8 AS subtotal,
  discount_amount::float8 AS "discountAmount",
  coupon_code AS "couponCode",
  shipping_address AS "shippingAddress",
  total::float8 AS total,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * The checkout transaction — the PRD's "learn transactions" showcase.
   * Everything below either all happens or none of it does: if stock
   * reservation fails for any line, or the coupon turns out to be
   * exhausted, the whole order (and every reservation already made in
   * this same call) rolls back automatically.
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) {
        throw new BadRequestException('Your cart is empty');
      }

      const cartItems = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: {
          product: { select: { name: true, sku: true, status: true } },
        },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      const items = cartItems.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        priceSnapshot: row.priceSnapshot.toNumber(),
        productName: row.product.name,
        productSku: row.product.sku,
        productStatus: row.product.status,
      }));

      const unavailable = items.find(
        (item) => item.productStatus !== ProductStatus.Active,
      );
      if (unavailable) {
        throw new BadRequestException(
          `"${unavailable.productName}" is no longer available`,
        );
      }

      const address = await tx.address.findFirst({
        where: { id: dto.addressId, userId },
      });

      if (!address) {
        throw new NotFoundException(`Address ${dto.addressId} not found`);
      }

      // Reserve every line in one statement — if any line is out of
      // stock, InventoryService.reserve throws and the whole transaction
      // (including this reservation) rolls back.
      await this.inventoryService.reserve(tx, items);

      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.priceSnapshot,
        0,
      );

      let discountAmount = 0;
      if (dto.couponCode) {
        const validation = await this.couponsService.validate(
          dto.couponCode,
          subtotal,
        );
        const redeemed = await this.couponsService.redeem(dto.couponCode, tx);
        if (!redeemed) {
          throw new BadRequestException('This coupon is no longer available');
        }
        discountAmount = validation.discountAmount;
      }

      // calculate_order_total is a real Postgres function (see the
      // migrations directory), not application code re-implementing the
      // same arithmetic — GREATEST(...) there guards against a total
      // going negative if a discount ever exceeded the subtotal.
      const [{ total }] = await tx.$queryRaw<
        Array<{ total: number }>
      >(Prisma.sql`
        SELECT calculate_order_total(${subtotal}, ${discountAmount})::float8 AS total
      `);

      const createdOrder = await tx.order.create({
        data: {
          userId,
          subtotal,
          discountAmount,
          couponCode: dto.couponCode,
          shippingAddress: {
            street: address.street,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
          total,
        },
      });

      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          unitPrice: item.priceSnapshot,
          quantity: item.quantity,
          taxAmount: 0,
          lineTotal: Math.round(item.quantity * item.priceSnapshot * 100) / 100,
        })),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return toOrderRow(createdOrder);
    });

    return this.toResponse(order, await this.getItems(order.id));
  }

  findAllForUser(
    userId: string,
    query: OrderQueryDto,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    return this.queryOrders(query, Prisma.sql`user_id = ${userId}`);
  }

  findAllAdmin(
    query: OrderQueryDto,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    return this.queryOrders(query, undefined);
  }

  async findOneForUser(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    return this.toResponseOrThrow(order, orderId);
  }

  async findOneAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    return this.toResponseOrThrow(order, orderId);
  }

  /** Customer self-service cancel — only while still pending; anything further along goes through admin's full state machine. */
  async cancelOwnOrder(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      if (order.status !== OrderStatus.Pending) {
        throw new BadRequestException(
          `Cannot cancel an order in "${order.status}" status yourself — contact support`,
        );
      }

      return this.transitionStatus(
        tx,
        toOrderRow(order),
        OrderStatus.Cancelled,
      );
    });
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    return this.prisma.$transaction((tx) =>
      this.updateStatusWithTx(tx, orderId, status),
    );
  }

  /**
   * Same as updateStatus, but joins a transaction the caller already
   * opened instead of starting its own — used by PaymentsService so a
   * payment's success/refund and the order's resulting status change
   * (and the inventory fulfillment that comes with it) commit or roll
   * back as one atomic unit, never as two separate transactions that
   * could disagree if the second one failed.
   */
  async updateStatusWithTx(
    tx: DbTransaction,
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const order = await tx.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.transitionStatus(tx, toOrderRow(order), status);
  }

  private async transitionStatus(
    tx: DbTransaction,
    order: OrderRow,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot move an order from "${order.status}" to "${status}"`,
      );
    }

    const items = (
      await tx.orderItem.findMany({ where: { orderId: order.id } })
    ).map(toOrderItemRow);

    if (status === OrderStatus.Paid && order.status === OrderStatus.Pending) {
      await this.inventoryService.fulfill(tx, items);
    }

    if (
      status === OrderStatus.Cancelled &&
      order.status === OrderStatus.Pending
    ) {
      await this.inventoryService.release(tx, items);
    }

    const updated = toOrderRow(
      await tx.order.update({ where: { id: order.id }, data: { status } }),
    );

    await this.notifyStatusChange(tx, updated);

    return this.toResponse(updated, items);
  }

  private async notifyStatusChange(
    tx: DbTransaction,
    order: OrderRow,
  ): Promise<void> {
    const notification = NOTIFICATION_FOR_STATUS[order.status];
    if (!notification) {
      return;
    }

    const shortId = order.id.slice(0, 8);
    await this.notificationsService.create(
      order.userId,
      notification.type,
      notification.title,
      `Order #${shortId} ${notification.message}`,
      { orderId: order.id },
      tx,
    );
  }

  private async queryOrders(
    query: OrderQueryDto,
    scopeWhere: Prisma.Sql | undefined,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    const { limit, cursor, status } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const statusWhere = status ? Prisma.sql`status = ${status}` : undefined;
    const baseWhere =
      scopeWhere && statusWhere
        ? Prisma.sql`${scopeWhere} AND ${statusWhere}`
        : (scopeWhere ?? statusWhere);

    const {
      where,
      orderBy,
      limit: lim,
    } = withCursorPagination({
      where: baseWhere,
      limit: limit + 1,
      cursors: [
        ['created_at', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.$queryRaw<OrderRow[]>(Prisma.sql`
      SELECT ${ORDER_COLUMNS_SQL}
      FROM orders
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${lim}
    `);

    const page = toCursorPage(rows, limit, (last) => [last.createdAt, last.id]);

    const itemsByOrder = await this.getItemsForOrders(
      page.data.map((order) => order.id),
    );

    return {
      ...page,
      data: page.data.map((order) =>
        this.toResponse(order, itemsByOrder.get(order.id) ?? []),
      ),
    };
  }

  private async toResponseOrThrow(
    order: PrismaOrder | null,
    orderId: string,
  ): Promise<OrderResponseDto> {
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const row = toOrderRow(order);
    return this.toResponse(row, await this.getItems(row.id));
  }

  private async getItems(orderId: string): Promise<OrderItemRow[]> {
    return (await this.prisma.orderItem.findMany({ where: { orderId } })).map(
      toOrderItemRow,
    );
  }

  private async getItemsForOrders(
    orderIds: string[],
  ): Promise<Map<string, OrderItemRow[]>> {
    if (orderIds.length === 0) {
      return new Map();
    }

    const rows = (
      await this.prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
      })
    ).map(toOrderItemRow);

    const map = new Map<string, OrderItemRow[]>();
    for (const row of rows) {
      const bucket = map.get(row.orderId) ?? [];
      bucket.push(row);
      map.set(row.orderId, bucket);
    }
    return map;
  }

  private toResponse(order: OrderRow, items: OrderItemRow[]): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      // Written only by checkout() as {street, city, state, postalCode,
      // country} (see the shippingAddress snapshot in checkout()) — Prisma
      // types the column as generic JSON, so the shape isn't visible here.
      shippingAddress:
        order.shippingAddress as unknown as ShippingAddressSnapshotDto,
      total: order.total,
      items,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
