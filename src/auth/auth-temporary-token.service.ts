import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';

export type AuthTemporaryTokenType =
  'OAUTH_STATE' | 'OAUTH_RESULT' | 'SIGNUP_TICKET' | 'LINK_TICKET';

interface ConsumeTokenErrors {
  invalidCode: string;
  invalidMessage: string;
  expiredCode: string;
  expiredMessage: string;
}

@Injectable()
export class AuthTemporaryTokenService {
  constructor(private readonly prisma: PrismaService) {}

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
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      throw this.invalidToken(errors);
    }

    return record.payload as T;
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
}
