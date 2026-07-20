// src/auth/password-reset-token.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { generateToken, hashToken } from '@/common/utils/token-hash.util';
import { DatabaseService } from '@/database/database.service';
import { passwordResetTokens } from '@/database/schema';

interface IssuedResetToken {
  token: string;
  expiresAt: Date;
}

const MS_PER_MINUTE = 60 * 1000;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async issue(userId: string): Promise<IssuedResetToken> {
    const ttlMs =
      this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 15) *
      MS_PER_MINUTE;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.db.insert(passwordResetTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  /** Marks the token used and returns the owning user id, or null if it's invalid, expired, or already used. */
  async consume(rawToken: string): Promise<string | null> {
    const tokenHash = hashToken(rawToken);

    const [existing] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (
      !existing ||
      existing.usedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      return null;
    }

    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, existing.id));

    return existing.userId;
  }
}
