// src/modules/notifications/graphql/notifications.resolver.ts

import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CursorPaginatedType } from '@/common/graphql/cursor-paginated.type';
import { CursorPaginationArgs } from '@/common/graphql/cursor-pagination.args';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { NotificationsService } from '../notifications.service';
import { NotificationModel } from './notification.model';

const NotificationCursorPage = CursorPaginatedType(NotificationModel);

@Resolver(() => NotificationModel)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => NotificationCursorPage, { name: 'notifications' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Args() { limit, cursor }: CursorPaginationArgs,
    @Args('unreadOnly', { nullable: true }) unreadOnly?: boolean,
  ) {
    return this.notificationsService.findAllForUser(user.id, {
      limit,
      cursor,
      unreadOnly,
    });
  }

  @Query(() => Int, { name: 'unreadNotificationCount' })
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllRead(user.id);
    return true;
  }

  @Mutation(() => NotificationModel)
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Mutation(() => NotificationModel)
  removeNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.notificationsService.remove(user.id, id);
  }
}
