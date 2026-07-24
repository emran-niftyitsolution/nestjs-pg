// src/modules/addresses/addresses.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import type { DbTransaction } from '@/database/db-transaction.type';
import { PrismaService } from '@/database/prisma.service';
import type { Address } from '@/generated/prisma/client';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      const total = await tx.address.count({ where: { userId } });

      // The very first address always becomes the default — there's no
      // sensible "no default address" state for a brand-new user to be in.
      const isDefault = dto.isDefault || total === 0;

      if (isDefault) {
        await this.clearCurrentDefault(tx, userId);
      }

      return tx.address.create({
        data: {
          userId,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          isDefault,
        },
      });
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearCurrentDefault(tx, userId);
      }

      const { count } = await tx.address.updateMany({
        where: { id, userId },
        data: dto,
      });

      if (count === 0) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      return tx.address.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Atomically swap the default: clear whichever address holds it, then set this one. */
  async setDefault(userId: string, id: string): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      await this.clearCurrentDefault(tx, userId);

      const { count } = await tx.address.updateMany({
        where: { id, userId },
        data: { isDefault: true },
      });

      if (count === 0) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      return tx.address.findUniqueOrThrow({ where: { id } });
    });
  }

  async remove(userId: string, id: string): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId } });

      if (!existing) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      const deleted = await tx.address.delete({ where: { id } });

      // Deleting the default address shouldn't silently leave the account
      // without one — promote the most recently added remaining address.
      if (deleted.isDefault) {
        const nextDefault = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextDefault) {
          await tx.address.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }

      return deleted;
    });
  }

  private async clearCurrentDefault(
    tx: DbTransaction,
    userId: string,
  ): Promise<void> {
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
