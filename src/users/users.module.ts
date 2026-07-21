// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersResolver } from './graphql/users.resolver';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
