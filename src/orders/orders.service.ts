// src/orders/orders.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { OrderStatus } from '@/common/enums/order-status.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { CouponsService } from '@/coupons/coupons.service';
import { DatabaseService } from '@/database/database.service';
import type { DbTransaction } from '@/database/db-transaction.type';
import {
  addresses,
  cartItems,
  carts,
  type Order,
  type OrderItem,
  orderItems,
  orders,
  products,
} from '@/database/schema';
import { InventoryService } from '@/inventory/inventory.service';
import { NotificationsService } from '@/notifications/notifications.service';
import type { CheckoutDto } from './dto/checkout.dto';
import type { OrderQueryDto } from './dto/order-query.dto';
import type { OrderResponseDto } from './dto/order-response.dto';

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

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly inventoryService: InventoryService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * The checkout transaction — the PRD's "learn transactions" showcase.
   * Everything below either all happens or none of it does: if stock
   * reservation fails for any line, or the coupon turns out to be
   * exhausted, the whole order (and every reservation already made in
   * this same call) rolls back automatically.
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    const order = await this.db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);

      const items = cart
        ? await tx
            .select({
              productId: cartItems.productId,
              quantity: cartItems.quantity,
              priceSnapshot: cartItems.priceSnapshot,
              productName: products.name,
              productSku: products.sku,
              productStatus: products.status,
            })
            .from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.cartId, cart.id))
        : [];

      if (items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      const unavailable = items.find((item) => item.productStatus !== 'active');
      if (unavailable) {
        throw new BadRequestException(
          `"${unavailable.productName}" is no longer available`,
        );
      }

      const [address] = await tx
        .select()
        .from(addresses)
        .where(
          and(eq(addresses.id, dto.addressId), eq(addresses.userId, userId)),
        )
        .limit(1);

      if (!address) {
        throw new NotFoundException(`Address ${dto.addressId} not found`);
      }

      // Reserve every line before touching anything else — if any one
      // line is out of stock, InventoryService.reserve throws and the
      // transaction unwinds every reservation made so far in this loop.
      for (const item of items) {
        await this.inventoryService.reserve(tx, item.productId, item.quantity);
      }

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
      const [{ total }] = await tx.execute<{ total: number }>(
        sql`SELECT calculate_order_total(${subtotal}, ${discountAmount}) AS total`,
      );

      const [createdOrder] = await tx
        .insert(orders)
        .values({
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
        })
        .returning();

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          unitPrice: item.priceSnapshot,
          quantity: item.quantity,
          taxAmount: 0,
          lineTotal: Math.round(item.quantity * item.priceSnapshot * 100) / 100,
        })),
      );

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      return createdOrder;
    });

    return this.toResponse(order, await this.getItems(order.id));
  }

  findAllForUser(
    userId: string,
    query: OrderQueryDto,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    return this.queryOrders(query, eq(orders.userId, userId));
  }

  findAllAdmin(
    query: OrderQueryDto,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    return this.queryOrders(query, undefined);
  }

  findOneForUser(userId: string, orderId: string): Promise<OrderResponseDto> {
    return this.findOneWhere(
      and(eq(orders.id, orderId), eq(orders.userId, userId)),
      orderId,
    );
  }

  findOneAdmin(orderId: string): Promise<OrderResponseDto> {
    return this.findOneWhere(eq(orders.id, orderId), orderId);
  }

  /** Customer self-service cancel — only while still pending; anything further along goes through admin's full state machine. */
  async cancelOwnOrder(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
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
          `Cannot cancel an order in "${order.status}" status yourself — contact support`,
        );
      }

      return this.transitionStatus(tx, order, OrderStatus.Cancelled);
    });
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    return this.db.transaction((tx) =>
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
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.transitionStatus(tx, order, status);
  }

  private async transitionStatus(
    tx: DbTransaction,
    order: Order,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot move an order from "${order.status}" to "${status}"`,
      );
    }

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    if (status === OrderStatus.Paid && order.status === OrderStatus.Pending) {
      for (const item of items) {
        await this.inventoryService.fulfill(tx, item.productId, item.quantity);
      }
    }

    if (
      status === OrderStatus.Cancelled &&
      order.status === OrderStatus.Pending
    ) {
      for (const item of items) {
        await this.inventoryService.release(tx, item.productId, item.quantity);
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({ status })
      .where(eq(orders.id, order.id))
      .returning();

    await this.notifyStatusChange(tx, updated);

    return this.toResponse(updated, items);
  }

  private async notifyStatusChange(
    tx: DbTransaction,
    order: Order,
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
    scopeWhere: SQL | undefined,
  ): Promise<CursorPaginatedResult<OrderResponseDto>> {
    const { limit, cursor, status } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const statusWhere = status ? eq(orders.status, status) : undefined;
    const where =
      scopeWhere && statusWhere
        ? and(scopeWhere, statusWhere)
        : (scopeWhere ?? statusWhere);

    const pagination = withCursorPagination({
      where,
      limit: limit + 1,
      cursors: [
        [orders.createdAt, 'desc', createdAtCursor],
        [orders.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(orders)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null;

    const itemsByOrder = await this.getItemsForOrders(
      pageRows.map((order) => order.id),
    );
    const data = pageRows.map((order) =>
      this.toResponse(order, itemsByOrder.get(order.id) ?? []),
    );

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  private async findOneWhere(
    where: SQL | undefined,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const [order] = await this.db.select().from(orders).where(where).limit(1);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.toResponse(order, await this.getItems(order.id));
  }

  private getItems(orderId: string): Promise<OrderItem[]> {
    return this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  private async getItemsForOrders(
    orderIds: string[],
  ): Promise<Map<string, OrderItem[]>> {
    if (orderIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const map = new Map<string, OrderItem[]>();
    for (const row of rows) {
      const bucket = map.get(row.orderId) ?? [];
      bucket.push(row);
      map.set(row.orderId, bucket);
    }
    return map;
  }

  private toResponse(order: Order, items: OrderItem[]): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      shippingAddress: order.shippingAddress,
      total: order.total,
      items,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
