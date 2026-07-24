// src/modules/product-images/product-images.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, type ProductImage } from '@/generated/prisma/client';
import { ProductsService } from '@/modules/products/products.service';
import type { CreateProductImageDto } from './dto/create-product-image.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

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

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const { count } = await this.prisma.productImage.updateMany({
      where: { id: imageId, productId },
      data: dto,
    });

    if (count === 0) {
      throw new NotFoundException(
        `Image ${imageId} not found on product ${productId}`,
      );
    }

    return this.prisma.productImage.findUniqueOrThrow({
      where: { id: imageId },
    });
  }

  async remove(productId: string, imageId: string): Promise<ProductImage> {
    try {
      return await this.prisma.productImage.delete({
        where: { id: imageId, productId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Image ${imageId} not found on product ${productId}`,
        );
      }
      throw error;
    }
  }

  private listImages(productId: string): Promise<ProductImage[]> {
    // A handful of images per product at most — a plain ordered list is
    // simpler and cheaper here than adding cursor pagination for no benefit.
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
