// src/modules/notifications/notifications.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationType } from '@/common/enums/notification-type.enum';
import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { decodeCursor } from '@/common/utils/cursor.util';
import {
  toCursorPage,
  withCursorPagination,
} from '@/common/utils/cursor-pagination.util';
import type { DbTransaction } from '@/database/db-transaction.type';
import { PrismaService } from '@/database/prisma.service';
import { type Notification, Prisma } from '@/generated/prisma/client';
import type { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const client = tx ?? this.prisma;
    return client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
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
      ? Prisma.sql`user_id = ${userId} AND read_at IS NULL`
      : Prisma.sql`user_id = ${userId}`;

    const {
      where,
      orderBy,
      limit: lim,
    } = withCursorPagination({
      where: scopeWhere,
      limit: limit + 1,
      cursors: [
        ['created_at', 'desc', createdAtCursor],
        ['id', 'asc', idCursor],
      ],
    });

    const rows = await this.prisma.$queryRaw<Notification[]>(Prisma.sql`
      SELECT id, user_id AS "userId", type, title, message, metadata,
             read_at AS "readAt", created_at AS "createdAt"
      FROM notifications
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${lim}
    `);

    return toCursorPage(rows, limit, (last) => [last.createdAt, last.id]);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.findUniqueOrThrow({ where: { id } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async remove(userId: string, id: string): Promise<Notification> {
    try {
      return await this.prisma.notification.delete({ where: { id, userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Notification ${id} not found`);
      }
      throw error;
    }
  }
}
