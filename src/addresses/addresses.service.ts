// src/addresses/addresses.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '@/database/database.service';
import type { DbTransaction } from '@/database/db-transaction.type';
import { type Address, addresses } from '@/database/schema';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  findAllForUser(userId: string): Promise<Address[]> {
    return this.db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const [address] = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);

    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.db.transaction(async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(addresses)
        .where(eq(addresses.userId, userId));

      // The very first address always becomes the default — there's no
      // sensible "no default address" state for a brand-new user to be in.
      const isDefault = dto.isDefault || total === 0;

      if (isDefault) {
        await this.clearCurrentDefault(tx, userId);
      }

      const [address] = await tx
        .insert(addresses)
        .values({
          userId,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          isDefault,
        })
        .returning();

      return address;
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    return this.db.transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearCurrentDefault(tx, userId);
      }

      const [address] = await tx
        .update(addresses)
        .set(dto)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .returning();

      if (!address) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      return address;
    });
  }

  /** Atomically swap the default: clear whichever address holds it, then set this one. */
  async setDefault(userId: string, id: string): Promise<Address> {
    return this.db.transaction(async (tx) => {
      await this.clearCurrentDefault(tx, userId);

      const [address] = await tx
        .update(addresses)
        .set({ isDefault: true })
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .returning();

      if (!address) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      return address;
    });
  }

  async remove(userId: string, id: string): Promise<Address> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .returning();

      if (!deleted) {
        throw new NotFoundException(`Address ${id} not found`);
      }

      // Deleting the default address shouldn't silently leave the account
      // without one — promote the most recently added remaining address.
      if (deleted.isDefault) {
        const [nextDefault] = await tx
          .select()
          .from(addresses)
          .where(eq(addresses.userId, userId))
          .orderBy(desc(addresses.createdAt))
          .limit(1);

        if (nextDefault) {
          await tx
            .update(addresses)
            .set({ isDefault: true })
            .where(eq(addresses.id, nextDefault.id));
        }
      }

      return deleted;
    });
  }

  private async clearCurrentDefault(
    tx: DbTransaction,
    userId: string,
  ): Promise<void> {
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  }
}
