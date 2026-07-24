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
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

    // Same pool tuning as the previous postgres.js client, ported 1:1.
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    super({ adapter: new PrismaPg(pool) });

    this.pool = pool;

    const { host, port, pathname } = new URL(databaseUrl);
    this.logger.log(
      `Connecting to database ${pathname.replace('/', '')} at ${host}:${port}`,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$queryRaw`select 1`;
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
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}
