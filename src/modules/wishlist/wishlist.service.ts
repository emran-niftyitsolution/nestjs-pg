// src/modules/wishlist/wishlist.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { PrismaService } from '@/database/prisma.service';
import type { WishlistItemResponseDto } from './dto/wishlist-item-response.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<WishlistItemResponseDto[]> {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productId: true,
        createdAt: true,
        product: {
          select: { name: true, slug: true, price: true, stock: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      productSlug: row.product.slug,
      price: row.product.price.toNumber(),
      stock: row.product.stock,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async add(userId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { status: true },
    });

    if (!product || product.status !== ProductStatus.Active) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Idempotent: saving an already-saved product is a no-op, not a 409 —
    // "add to wishlist" isn't a create-once resource the way most POSTs are.
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }
}
