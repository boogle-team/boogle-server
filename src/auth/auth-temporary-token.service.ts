import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';

export type AuthTemporaryTokenType = 'OAUTH_STATE' | 'OAUTH_RESULT';

interface ConsumeTokenErrors {
  invalidCode: string;
  invalidMessage: string;
  expiredCode: string;
  expiredMessage: string;
}

@Injectable()
export class AuthTemporaryTokenService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AuthTemporaryTokenService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.cleanupExpiredTokens().catch((error: unknown) => {
      this.logger.error('인증 임시 토큰 초기 정리에 실패했습니다.', error);
    });

    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredTokens().catch((error: unknown) => {
        this.logger.error('인증 임시 토큰 정리에 실패했습니다.', error);
      });
    }, this.getCleanupIntervalSeconds() * 1000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async create(
    tokenType: AuthTemporaryTokenType,
    payload: object,
    expiresInSeconds: number,
  ) {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.authTemporaryToken.create({
      data: {
        tokenHash: this.hashToken(token),
        tokenType,
        payload,
        expiresAt: new Date(Date.now() + Math.max(1, expiresInSeconds) * 1000),
      },
    });

    return token;
  }

  async consume<T>(
    token: string,
    tokenType: AuthTemporaryTokenType,
    errors: ConsumeTokenErrors,
  ): Promise<T> {
    const record = await this.prisma.authTemporaryToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!record || record.tokenType !== tokenType || record.usedAt) {
      throw this.invalidToken(errors);
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BusinessException(
        errors.expiredCode,
        errors.expiredMessage,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const consumed = await this.prisma.authTemporaryToken.updateMany({
      where: {
        id: record.id,
        tokenType,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
        payload: {},
      },
    });

    if (consumed.count !== 1) {
      throw this.invalidToken(errors);
    }

    return record.payload as T;
  }

  async cleanupExpiredTokens() {
    const retentionCutoff = new Date(
      Date.now() - this.getRetentionSeconds() * 1000,
    );

    return await this.prisma.authTemporaryToken.deleteMany({
      where: {
        OR: [
          { usedAt: { lte: retentionCutoff } },
          { expiresAt: { lte: retentionCutoff } },
        ],
      },
    });
  }

  private invalidToken(errors: ConsumeTokenErrors) {
    return new BusinessException(
      errors.invalidCode,
      errors.invalidMessage,
      HttpStatus.UNAUTHORIZED,
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRetentionSeconds() {
    return this.parseDuration(
      process.env.AUTH_TEMPORARY_TOKEN_RETENTION ?? '7d',
      7 * 24 * 60 * 60,
    );
  }

  private getCleanupIntervalSeconds() {
    return Math.max(
      60,
      this.parseDuration(
        process.env.AUTH_TEMPORARY_TOKEN_CLEANUP_INTERVAL ?? '1h',
        60 * 60,
      ),
    );
  }

  private parseDuration(value: string, fallback: number) {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    const match = trimmedValue.match(/^(\d+)([smhd])$/);
    if (!match) {
      return fallback;
    }

    const multiplierByUnit: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return Number(match[1]) * multiplierByUnit[match[2]];
  }
}
