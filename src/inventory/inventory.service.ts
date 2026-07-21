// src/inventory/inventory.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '@/database/database.service';
import type { DbTransaction } from '@/database/db-transaction.type';
import { type Inventory, inventory, products } from '@/database/schema';

// select/insert/update all work identically on the base db handle and on a
// transaction — only .transaction() itself differs — so helpers that don't
// care which one they got can accept either.
type Queryable = DatabaseService['db'] | DbTransaction;

@Injectable()
export class InventoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async findOne(productId: string): Promise<Inventory> {
    const row = await this.getOrInitRow(this.db, productId);
    return row;
  }

  async getSummary(productId: string): Promise<{
    productId: string;
    stock: number;
    reservedStock: number;
    soldStock: number;
    availableStock: number;
  }> {
    const [product] = await this.db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const row = await this.getOrInitRow(this.db, productId);

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
   * reserve it; the second one's WHERE simply matches no row.
   */
  async reserve(
    tx: DbTransaction,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await this.getOrInitRow(tx, productId);

    const [reserved] = await tx
      .update(inventory)
      .set({ reservedStock: sql`${inventory.reservedStock} + ${quantity}` })
      .where(
        sql`${inventory.productId} = ${productId}
          AND (
            SELECT stock FROM products WHERE id = ${productId}
          ) - ${inventory.reservedStock} >= ${quantity}`,
      )
      .returning();

    if (!reserved) {
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
    await tx
      .update(inventory)
      .set({ reservedStock: sql`${inventory.reservedStock} - ${quantity}` })
      .where(eq(inventory.productId, productId));
  }

  /** Moves reserved units to sold and finalizes the deduction from products.stock — called on pending -> paid. */
  async fulfill(
    tx: DbTransaction,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await tx
      .update(inventory)
      .set({
        reservedStock: sql`${inventory.reservedStock} - ${quantity}`,
        soldStock: sql`${inventory.soldStock} + ${quantity}`,
      })
      .where(eq(inventory.productId, productId));

    await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}` })
      .where(eq(products.id, productId));
  }

  /** Inventory rows are created lazily on first reservation, not when the product itself is created. */
  private async getOrInitRow(
    db: Queryable,
    productId: string,
  ): Promise<Inventory> {
    const [existing] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .limit(1);
    if (existing) {
      return existing;
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const [created] = await db
      .insert(inventory)
      .values({ productId })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return created;
    }

    // Lost the race to create the row (another concurrent reservation got
    // there first) — it now exists, so just read it back.
    const [row] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .limit(1);
    return row;
  }
}
