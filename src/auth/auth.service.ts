// src/auth/auth.service.ts

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify as argon2Verify } from 'argon2';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { NotificationsService } from '@/notifications/notifications.service';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { SafeUser, UsersService } from '@/users/users.service';
import { JwtPayload } from './auth.types';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';
import { PasswordResetTokenService } from './password-reset-token.service';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    this.logger.log(`Registered new user ${user.id}`);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    this.logger.log(`User ${user.id} logged in`);
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<SafeUser> {
    return this.usersService.findOne(userId);
  }

  /** Redeems a refresh token for a new access + refresh token pair (rotation). */
  async refresh(refreshToken: string): Promise<TokenPairResponseDto> {
    const rotated = await this.refreshTokenService.rotate(refreshToken);

    if (!rotated) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findOne(rotated.userId);
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: rotated.token,
    };
  }

  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<MessageResponseDto> {
    await this.refreshTokenService.revokeOwnedByUser(refreshToken, userId);
    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const user = await this.usersService.findByIdWithPassword(userId);
    const currentPasswordMatches = await argon2Verify(
      user.password,
      dto.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // UsersService.update hashes the password for us — pass it the raw value.
    await this.usersService.update(userId, { password: dto.newPassword });
    // Force every other session to log in again with the new password.
    await this.refreshTokenService.revokeAllForUser(userId);
    await this.notifyPasswordChanged(userId);

    this.logger.log(`User ${userId} changed their password`);
    return { message: 'Password updated successfully' };
  }

  async forgotPassword(email: string): Promise<MessageResponseDto> {
    const message =
      'If that email is registered, a password reset link has been sent.';
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Same response whether or not the account exists, so callers can't
      // use this endpoint to discover which emails are registered.
      this.logger.warn('Password reset requested for an unregistered email');
      return { message };
    }

    const { token, expiresAt } = await this.passwordResetTokenService.issue(
      user.id,
    );

    // TODO: send this via a real mail provider once one exists. Until then
    // it's logged so the flow can be exercised locally / through Swagger.
    this.logger.warn(
      `Password reset token for ${user.email} (expires ${expiresAt.toISOString()}): ${token}`,
    );

    return { message };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const userId = await this.passwordResetTokenService.consume(token);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.usersService.update(userId, { password: newPassword });
    await this.refreshTokenService.revokeAllForUser(userId);
    await this.notifyPasswordChanged(userId);

    this.logger.log(`User ${userId} reset their password`);
    return { message: 'Password has been reset successfully' };
  }

  private async notifyPasswordChanged(userId: string): Promise<void> {
    await this.notificationsService.create(
      userId,
      NotificationType.PasswordChanged,
      'Password changed',
      'Your password was just changed. If this wasn’t you, reset it again immediately.',
    );
  }

  private async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUser> {
    const user = await this.usersService.findByEmail(email);
    const passwordMatches =
      !!user && (await argon2Verify(user.password, password));

    if (!user || !passwordMatches) {
      this.logger.warn(`Failed login attempt for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private async buildAuthResponse(user: SafeUser): Promise<AuthResponseDto> {
    const accessToken = this.signAccessToken(user);
    const { token: refreshToken } = await this.refreshTokenService.issue(
      user.id,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  private signAccessToken(user: SafeUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
