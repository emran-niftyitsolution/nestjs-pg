// src/modules/inventory/inventory.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DbTransaction } from '@/database/db-transaction.type';
import { PrismaService } from '@/database/prisma.service';
import {
  type Inventory,
  Prisma,
  type PrismaClient,
} from '@/generated/prisma/client';

// update/findUnique/upsert all work identically on the base client and on a
// transaction — only $transaction() itself differs — so helpers that don't
// care which one they got can accept either.
type Queryable = PrismaClient | DbTransaction;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(productId: string): Promise<Inventory> {
    return this.getOrInitRow(this.prisma, productId);
  }

  async getSummary(productId: string): Promise<{
    productId: string;
    stock: number;
    reservedStock: number;
    soldStock: number;
    availableStock: number;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const row = await this.getOrInitRow(this.prisma, productId);

    return {
      productId,
      stock: product.stock,
      reservedStock: row.reservedStock,
      soldStock: row.soldStock,
      availableStock: product.stock - row.reservedStock,
    };
  }

  /**
   * Atomically checks "is there enough unreserved stock?" and reserves it
   * in the same statement — the UPDATE's WHERE clause re-reads
   * products.stock and inventory.reserved_stock as of the moment it runs,
   * so two concurrent checkouts racing for the last unit can't both
   * reserve it; the second one's WHERE simply matches no row. Raw SQL
   * because the WHERE clause compares a subquery to a column, which isn't
   * expressible in Prisma's filter DSL.
   */
  async reserve(
    tx: DbTransaction,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await this.getOrInitRow(tx, productId);

    const reserved = await tx.$queryRaw<
      Array<{ productId: string }>
    >(Prisma.sql`
      UPDATE inventory
      SET reserved_stock = reserved_stock + ${quantity}
      WHERE product_id = ${productId}
        AND (SELECT stock FROM products WHERE id = ${productId}) - reserved_stock >= ${quantity}
      RETURNING product_id AS "productId"
    `);

    if (reserved.length === 0) {
      throw new BadRequestException(
        `Not enough stock available for product ${productId}`,
      );
    }
  }

  /** Releases a reservation without touching products.stock — used when a pending order is cancelled. */
  async release(
    tx: DbTransaction,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await tx.inventory.update({
      where: { productId },
      data: { reservedStock: { decrement: quantity } },
    });
  }

  /** Moves reserved units to sold and finalizes the deduction from products.stock — called on pending -> paid. */
  async fulfill(
    tx: DbTransaction,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await tx.inventory.update({
      where: { productId },
      data: {
        reservedStock: { decrement: quantity },
        soldStock: { increment: quantity },
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });
  }

  /** Inventory rows are created lazily on first reservation, not when the product itself is created. */
  private async getOrInitRow(
    db: Queryable,
    productId: string,
  ): Promise<Inventory> {
    const existing = await db.inventory.findUnique({ where: { productId } });
    if (existing) {
      return existing;
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    return db.inventory.upsert({
      where: { productId },
      create: { productId },
      update: {},
    });
  }
}
