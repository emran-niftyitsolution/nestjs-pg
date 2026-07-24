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

export interface InventoryAdjustment {
  productId: string;
  quantity: number;
}

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
   * for every line in a single statement — one row per product via
   * unnest(), not one round trip per line item. The WHERE clause re-reads
   * products.stock and inventory.reserved_stock as of the moment it runs,
   * so concurrent checkouts racing for the last unit still can't both
   * reserve it: a row that fails the check is simply absent from
   * RETURNING. Raw SQL because the WHERE clause compares a subquery to a
   * column, which isn't expressible in Prisma's filter DSL.
   */
  async reserve(
    tx: DbTransaction,
    items: InventoryAdjustment[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    await this.ensureRows(
      tx,
      items.map((item) => item.productId),
    );

    const productIds = items.map((item) => item.productId);
    const quantities = items.map((item) => item.quantity);

    const reserved = await tx.$queryRaw<
      Array<{ productId: string }>
    >(Prisma.sql`
      UPDATE inventory
      SET reserved_stock = reserved_stock + v.quantity
      FROM (
        SELECT * FROM unnest(${productIds}::uuid[], ${quantities}::int[]) AS v(product_id, quantity)
      ) v
      WHERE inventory.product_id = v.product_id
        AND (SELECT stock FROM products WHERE id = v.product_id) - inventory.reserved_stock >= v.quantity
      RETURNING inventory.product_id AS "productId"
    `);

    if (reserved.length < productIds.length) {
      const succeeded = new Set(reserved.map((row) => row.productId));
      const failed = productIds.filter((id) => !succeeded.has(id));
      throw new BadRequestException(
        `Not enough stock available for product(s): ${failed.join(', ')}`,
      );
    }
  }

  /** Releases reservations without touching products.stock — used when a pending order is cancelled. */
  async release(
    tx: DbTransaction,
    items: InventoryAdjustment[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE inventory
      SET reserved_stock = reserved_stock - v.quantity
      FROM (
        SELECT * FROM unnest(${items.map((item) => item.productId)}::uuid[], ${items.map((item) => item.quantity)}::int[]) AS v(product_id, quantity)
      ) v
      WHERE inventory.product_id = v.product_id
    `);
  }

  /** Moves reserved units to sold and finalizes the deduction from products.stock for every line — called on pending -> paid. */
  async fulfill(
    tx: DbTransaction,
    items: InventoryAdjustment[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const productIds = items.map((item) => item.productId);
    const quantities = items.map((item) => item.quantity);

    await tx.$executeRaw(Prisma.sql`
      UPDATE inventory
      SET reserved_stock = reserved_stock - v.quantity,
          sold_stock = sold_stock + v.quantity
      FROM (
        SELECT * FROM unnest(${productIds}::uuid[], ${quantities}::int[]) AS v(product_id, quantity)
      ) v
      WHERE inventory.product_id = v.product_id
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE products
      SET stock = stock - v.quantity
      FROM (
        SELECT * FROM unnest(${productIds}::uuid[], ${quantities}::int[]) AS v(product_id, quantity)
      ) v
      WHERE products.id = v.product_id
    `);
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

  /** Batch version of getOrInitRow's lazy-creation step — one findMany + one createMany for the whole set instead of a round trip per product. */
  private async ensureRows(db: Queryable, productIds: string[]): Promise<void> {
    const unique = [...new Set(productIds)];

    const existing = await db.inventory.findMany({
      where: { productId: { in: unique } },
      select: { productId: true },
    });
    const existingIds = new Set(existing.map((row) => row.productId));
    const missing = unique.filter((id) => !existingIds.has(id));

    if (missing.length === 0) {
      return;
    }

    const products = await db.product.findMany({
      where: { id: { in: missing } },
      select: { id: true },
    });
    if (products.length !== missing.length) {
      const found = new Set(products.map((product) => product.id));
      const notFound = missing.find((id) => !found.has(id));
      throw new NotFoundException(`Product ${notFound} not found`);
    }

    await db.inventory.createMany({
      data: missing.map((productId) => ({ productId })),
      skipDuplicates: true,
    });
  }
}
