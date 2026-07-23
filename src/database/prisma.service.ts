// src/database/prisma.service.ts

import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private readonly pool: Pool;

  public readonly prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const { host, port, pathname } = new URL(databaseUrl);

    // Same pool tuning as the previous postgres.js client, ported 1:1.
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    this.prisma = new PrismaClient({
      adapter: new PrismaPg(this.pool),
    });

    this.logger.log(
      `Connecting to database ${pathname.replace('/', '')} at ${host}:${port}`,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$queryRaw`select 1`;
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error(
        'Failed to establish database connection',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}
