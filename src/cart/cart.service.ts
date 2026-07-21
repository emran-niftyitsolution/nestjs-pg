// src/cart/cart.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { DatabaseService } from '@/database/database.service';
import { type Cart, cartItems, carts, products } from '@/database/schema';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { CartResponseDto } from './dto/cart-response.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    const [product] = await this.db
      .select({
        price: products.price,
        stock: products.stock,
        status: products.status,
      })
      .from(products)
      .where(eq(products.id, dto.productId))
      .limit(1);

    if (!product || product.status !== ProductStatus.Active) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    // Advisory only, not a reservation: stock isn't held here, just
    // sanity-checked. Real reservation happens at checkout (Orders module),
    // inside a transaction — two people can still race past this check for
    // the last unit, and checkout is where that actually gets resolved.
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${product.stock} of this product left in stock`,
      );
    }

    await this.db
      .insert(cartItems)
      .values({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceSnapshot: product.price,
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId],
        set: {
          quantity: sql`${cartItems.quantity} + ${dto.quantity}`,
          priceSnapshot: product.price,
        },
      });

    return this.buildCartResponse(cart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    const [item] = await this.db
      .update(cartItems)
      .set({ quantity: dto.quantity })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    return this.buildCartResponse(cart);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    const [item] = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    return this.buildCartResponse(cart);
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return this.buildCartResponse(cart);
  }

  /**
   * Upsert on the (user_id) unique index: concurrent first-requests for the
   * same user race to insert, and Postgres resolves the conflict atomically
   * instead of one request crashing on a unique-violation.
   */
  private async getOrCreateCart(userId: string): Promise<Cart> {
    const [cart] = await this.db
      .insert(carts)
      .values({ userId })
      .onConflictDoUpdate({
        target: carts.userId,
        set: { updatedAt: new Date() },
      })
      .returning();

    return cart;
  }

  private async buildCartResponse(cart: Cart): Promise<CartResponseDto> {
    const rows = await this.db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        productName: products.name,
        productSlug: products.slug,
        quantity: cartItems.quantity,
        priceSnapshot: cartItems.priceSnapshot,
        currentPrice: products.price,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(cartItems.createdAt);

    const items = rows.map((row) => ({
      ...row,
      lineTotal: Math.round(row.quantity * row.priceSnapshot * 100) / 100,
    }));

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal:
        Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) /
        100,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
