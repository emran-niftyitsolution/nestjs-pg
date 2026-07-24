// src/modules/cart/cart.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { PrismaService } from '@/database/prisma.service';
import type { Cart } from '@/generated/prisma/client';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { CartResponseDto } from './dto/cart-response.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { price: true, stock: true, status: true },
    });

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

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: dto.productId },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceSnapshot: product.price,
      },
      update: {
        quantity: { increment: dto.quantity },
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

    const { count } = await this.prisma.cartItem.updateMany({
      where: { id: itemId, cartId: cart.id },
      data: { quantity: dto.quantity },
    });

    if (count === 0) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    return this.buildCartResponse(cart);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    if (count === 0) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    return this.buildCartResponse(cart);
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.buildCartResponse(cart);
  }

  /**
   * Upsert on the (user_id) unique index: concurrent first-requests for the
   * same user race to insert, and Postgres resolves the conflict atomically
   * instead of one request crashing on a unique-violation.
   */
  private getOrCreateCart(userId: string): Promise<Cart> {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: { updatedAt: new Date() },
    });
  }

  private async buildCartResponse(cart: Cart): Promise<CartResponseDto> {
    const rows = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        productId: true,
        quantity: true,
        priceSnapshot: true,
        product: { select: { name: true, slug: true, price: true } },
      },
    });

    const items = rows.map((row) => {
      const priceSnapshot = row.priceSnapshot.toNumber();
      return {
        id: row.id,
        productId: row.productId,
        productName: row.product.name,
        productSlug: row.product.slug,
        quantity: row.quantity,
        priceSnapshot,
        currentPrice: row.product.price.toNumber(),
        lineTotal: Math.round(row.quantity * priceSnapshot * 100) / 100,
      };
    });

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal:
        Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) /
        100,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
