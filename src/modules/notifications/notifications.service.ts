// src/modules/notifications/notifications.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { NotificationType } from '@/common/enums/notification-type.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor, encodeCursor } from '@/common/utils/cursor.util';
import { withCursorPagination } from '@/common/utils/cursor-pagination.util';
import { DatabaseService } from '@/database/database.service';
import type { DbTransaction } from '@/database/db-transaction.type';
import { type Notification, notifications } from '@/database/schema';
import type { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Not exposed over HTTP — called directly by other services (Orders on
   * shipped/delivered, Auth on password change) at the point the real
   * event happens. There's no event bus in this project; this is the
   * straightforward alternative at this scale.
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
    tx?: DbTransaction,
  ): Promise<Notification> {
    const db = tx ?? this.db;
    const [notification] = await db
      .insert(notifications)
      .values({ userId, type, title, message, metadata })
      .returning();

    return notification;
  }

  async findAllForUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<CursorPaginatedResult<Notification>> {
    const { limit, cursor, unreadOnly } = query;

    const [rawCreatedAt, rawId] = cursor
      ? decodeCursor(cursor)
      : [undefined, undefined];
    const createdAtCursor =
      typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : undefined;
    const idCursor = typeof rawId === 'string' ? rawId : undefined;

    const scopeWhere = unreadOnly
      ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
      : eq(notifications.userId, userId);

    const pagination = withCursorPagination({
      where: scopeWhere,
      limit: limit + 1,
      cursors: [
        [notifications.createdAt, 'desc', createdAtCursor],
        [notifications.id, 'asc', idCursor],
      ],
    });

    const rows = await this.db
      .select()
      .from(notifications)
      .where(pagination.where)
      .orderBy(...pagination.orderBy)
      .limit(pagination.limit);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, meta: { limit, hasNextPage, nextCursor } };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );

    return row.total;
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const [notification] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return notification;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
  }

  async remove(userId: string, id: string): Promise<Notification> {
    const [notification] = await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return notification;
  }
}
