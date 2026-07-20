// src/database/database.service.ts

import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { defineRelations, sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

const relations = defineRelations(schema, () => ({}));

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private readonly client: Sql;

  public readonly db: PostgresJsDatabase<typeof relations>;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const { host, port, pathname } = new URL(databaseUrl);

    this.client = postgres(databaseUrl, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });

    this.db = drizzle({
      client: this.client,
      relations,
    });

    this.logger.log(
      `Connecting to database ${pathname.replace('/', '')} at ${host}:${port}`,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.db.execute(sql`select 1`);
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
    await this.client.end();
    this.logger.log('Database connection closed');
  }
}
