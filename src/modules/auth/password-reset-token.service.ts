// src/modules/auth/password-reset-token.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateToken, hashToken } from '@/common/utils/token-hash.util';
import { PrismaService } from '@/database/prisma.service';

interface IssuedResetToken {
  token: string;
  expiresAt: Date;
}

const MS_PER_MINUTE = 60 * 1000;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async issue(userId: string): Promise<IssuedResetToken> {
    const ttlMs =
      this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 15) *
      MS_PER_MINUTE;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });

    return { token, expiresAt };
  }

  /** Marks the token used and returns the owning user id, or null if it's invalid, expired, or already used. */
  async consume(rawToken: string): Promise<string | null> {
    const tokenHash = hashToken(rawToken);

    const existing = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !existing ||
      existing.usedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      return null;
    }

    await this.prisma.passwordResetToken.update({
      where: { id: existing.id },
      data: { usedAt: new Date() },
    });

    return existing.userId;
  }
}
