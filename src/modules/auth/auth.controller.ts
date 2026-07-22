// src/modules/auth/auth.controller.ts

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user and issue a token pair' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email is already in use' })
  register(@Body() dto: CreateUserDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a refresh token (end one session)' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RefreshTokenDto,
  ): Promise<MessageResponseDto> {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current password' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing token, or current password is wrong',
  })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiOkResponse({ type: MessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
