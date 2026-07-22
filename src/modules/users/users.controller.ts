// src/modules/users/users.controller.ts

import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

// Self-service only. Admin-wide user management lives in AdminUsersController
// (/admin/users), gated by RolesGuard instead of "is this your own id".
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email is already in use' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete my account' })
  @ApiOkResponse({ type: UserResponseDto })
  removeMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(user.id);
  }
}
