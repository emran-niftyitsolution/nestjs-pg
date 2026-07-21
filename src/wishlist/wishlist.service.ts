// src/wishlist/wishlist.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { DatabaseService } from '@/database/database.service';
import { products, wishlistItems } from '@/database/schema';
import type { WishlistItemResponseDto } from './dto/wishlist-item-response.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  findAllForUser(userId: string): Promise<WishlistItemResponseDto[]> {
    return this.db
      .select({
        id: wishlistItems.id,
        productId: wishlistItems.productId,
        productName: products.name,
        productSlug: products.slug,
        price: products.price,
        stock: products.stock,
        createdAt: wishlistItems.createdAt,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId))
      .orderBy(desc(wishlistItems.createdAt));
  }

  async add(userId: string, productId: string): Promise<void> {
    const [product] = await this.db
      .select({ status: products.status })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product || product.status !== ProductStatus.Active) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Idempotent: saving an already-saved product is a no-op, not a 409 —
    // "add to wishlist" isn't a create-once resource the way most POSTs are.
    await this.db
      .insert(wishlistItems)
      .values({ userId, productId })
      .onConflictDoNothing();
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.db
      .delete(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, userId),
          eq(wishlistItems.productId, productId),
        ),
      );
  }
}
