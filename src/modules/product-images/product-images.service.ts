// src/modules/product-images/product-images.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '@/database/database.service';
import { type ProductImage, productImages } from '@/database/schema';
import { ProductsService } from '@/modules/products/products.service';
import type { CreateProductImageDto } from './dto/create-product-image.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly productsService: ProductsService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /** Public gallery — only for a product customers can actually see. */
  async findAllPublic(productId: string): Promise<ProductImage[]> {
    await this.productsService.findOnePublic(productId);
    return this.listImages(productId);
  }

  /** Admin gallery — works for a product in any status. */
  async findAllAdmin(productId: string): Promise<ProductImage[]> {
    await this.productsService.findOneAdmin(productId);
    return this.listImages(productId);
  }

  async create(
    productId: string,
    dto: CreateProductImageDto,
  ): Promise<ProductImage> {
    await this.productsService.findOneAdmin(productId);

    const [image] = await this.db
      .insert(productImages)
      .values({
        productId,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    return image;
  }

  async update(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const [image] = await this.db
      .update(productImages)
      .set(dto)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      )
      .returning();

    if (!image) {
      throw new NotFoundException(
        `Image ${imageId} not found on product ${productId}`,
      );
    }

    return image;
  }

  async remove(productId: string, imageId: string): Promise<ProductImage> {
    const [image] = await this.db
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      )
      .returning();

    if (!image) {
      throw new NotFoundException(
        `Image ${imageId} not found on product ${productId}`,
      );
    }

    return image;
  }

  private listImages(productId: string): Promise<ProductImage[]> {
    // A handful of images per product at most — a plain ordered list is
    // simpler and cheaper here than adding cursor pagination for no benefit.
    return this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));
  }
}
