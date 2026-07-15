import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import type { Prisma } from '@/generated/prisma/client';
import { AuthErrorCode } from './auth-error-code.enum';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SocialLinkRequestDto } from './dto/social-link-request.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

type OAuthProvider = 'kakao' | 'google';
type OAuthProviderCode = 'K' | 'G';

interface JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  email?: string | null;
  role?: 'USER';
  sessionId?: string;
}

interface OAuthProfile {
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  nickname: string | null;
  profileImage: string | null;
}

interface MemberResponseSource {
  id: bigint;
  email: string | null;
  nickname: string | null;
  profileImg: string | null;
  gender: string | null;
  ageGroup: number | null;
  baselineType: string | null;
  sensInfo: string;
  status: string;
}

@Injectable()
export class AuthService {
  private readonly tokenType = 'Bearer';
  private readonly socialProviderTimeoutMs = 5000;
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async socialLogin(dto: SocialLoginRequestDto) {
    try {
      const provider = this.assertProvider(dto.provider);
      const providerCode = this.toProviderCode(provider);
      const socialToken = this.assertSocialToken(dto.socialToken);

      const profile = await this.fetchOAuthProfile(provider, socialToken);

      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          provider: providerCode,
          providerId: profile.providerId,
        },
        include: {
          user: true,
        },
      });

      if (socialAccount) {
        this.assertActiveMember(socialAccount.user);
        const sensitiveInfoAgreed = await this.getSensitiveInfoAgreed(
          socialAccount.user.id,
          socialAccount.user.sensInfo,
        );

        return {
          ...(await this.issueTokenPair(socialAccount.user)),
          isNewUser: false,
          onboardingCompleted: this.isOnboardingCompleted(socialAccount.user),
          user: this.toMemberResponse(socialAccount.user, sensitiveInfoAgreed),
        };
      }

      await this.assertAccountLinkNotRequired(
        profile.emailVerified ? profile.email : null,
      );

      return {
        nextAction: 'SIGNUP_REQUIRED' as const,
        provider: this.toProviderResponse(providerCode),
        email: profile.email,
        nickname: profile.nickname,
        profileImage: profile.profileImage,
        isNewUser: true,
        onboardingCompleted: false,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.AUTH_EMAIL_ALREADY_USED,
          '동일한 이메일로 가입된 다른 소셜 계정이 존재합니다.',
          HttpStatus.CONFLICT,
        );
      }

      this.logger.error(
        `AuthService.socialLogin failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BusinessException(
        AuthErrorCode.SOCIAL_LOGIN_FAILED,
        '소셜 로그인 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async signup(dto: SignupRequestDto) {
    try {
      if (dto.privacyPolicyAgreed !== true) {
        throw new BusinessException(
          AuthErrorCode.PRIVACY_POLICY_AGREEMENT_REQUIRED,
          '개인정보 수집 동의가 필요합니다.',
        );
      }

      const provider = this.assertProvider(dto.provider);
      const providerCode = this.toProviderCode(provider);
      const socialToken = this.assertSocialToken(dto.socialToken);
      const profile = await this.fetchOAuthProfile(provider, socialToken);
      const existingSocialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          provider: providerCode,
          providerId: profile.providerId,
        },
      });

      if (existingSocialAccount) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_EXISTS,
          '이미 가입된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      await this.assertAccountLinkNotRequired(
        profile.emailVerified ? profile.email : null,
      );

      const now = new Date();
      const signupResult = await this.prisma.$transaction(async (tx) => {
        const createdMember = await tx.member.create({
          data: {
            email: profile.email,
            nickname: profile.nickname ?? '사용자',
            profileImg: profile.profileImage,
            status: 'A',
            sensInfo: dto.sensitiveInfoAgreed ? 'Y' : 'F',
          },
        });

        await tx.socialAccount.create({
          data: {
            userId: createdMember.id,
            provider: providerCode,
            providerId: profile.providerId,
            email: profile.email,
          },
        });

        await tx.memberConsent.createMany({
          data: [
            {
              userId: createdMember.id,
              consentType: 'PRIVACY',
              agreed: true,
              policyVersion: dto.privacyPolicyVersion,
              agreedAt: now,
            },
            {
              userId: createdMember.id,
              consentType: 'SENSITIVE',
              agreed: dto.sensitiveInfoAgreed,
              policyVersion: dto.sensitiveInfoPolicyVersion,
              agreedAt: dto.sensitiveInfoAgreed ? now : null,
            },
          ],
        });

        return {
          member: createdMember,
          tokens: await this.issueTokenPair(createdMember, tx),
        };
      });

      return {
        ...signupResult.tokens,
        isNewUser: true,
        onboardingCompleted: false,
        user: this.toMemberResponse(
          signupResult.member,
          dto.sensitiveInfoAgreed,
        ),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_EXISTS,
          '이미 가입된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      this.logger.error(
        `AuthService.signup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BusinessException(
        AuthErrorCode.SIGNUP_FAILED,
        '회원가입 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async socialLink(dto: SocialLinkRequestDto) {
    try {
      const provider = this.assertProvider(dto.provider);
      const providerCode = this.toProviderCode(provider);
      const socialToken = this.assertSocialToken(dto.socialToken);
      const profile = await this.fetchOAuthProfile(provider, socialToken);

      if (!profile.email || !profile.emailVerified) {
        throw new BusinessException(
          AuthErrorCode.AUTH_VERIFIED_EMAIL_REQUIRED,
          '인증된 이메일 정보가 필요합니다.',
        );
      }

      const existingSocialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          OR: [
            { provider: providerCode, providerId: profile.providerId },
            { provider: providerCode, email: profile.email },
          ],
        },
      });

      if (existingSocialAccount) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_LINKED,
          '이미 연동된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      const member = await this.prisma.member.findUnique({
        where: { email: profile.email },
      });

      if (!member) {
        throw new BusinessException(
          'USER_NOT_FOUND',
          '연동할 기존 회원을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      this.assertActiveMember(member);
      const linkResult = await this.prisma.$transaction(async (tx) => {
        await tx.socialAccount.create({
          data: {
            userId: member.id,
            provider: providerCode,
            providerId: profile.providerId,
            email: profile.email,
          },
        });

        return {
          socialAccounts: await tx.socialAccount.findMany({
            where: { userId: member.id },
            orderBy: { id: 'asc' },
          }),
          tokens: await this.issueTokenPair(member, tx),
        };
      });

      return {
        ...linkResult.tokens,
        onboardingCompleted: this.isOnboardingCompleted(member),
        socialAccounts: linkResult.socialAccounts.map((account) => ({
          provider: this.toProviderResponse(account.provider),
          maskedEmail: this.maskEmail(account.email),
          linkedAt: account.regDate.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_LINKED,
          '이미 연동된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      this.logger.error(
        `AuthService.socialLink failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BusinessException(
        AuthErrorCode.SOCIAL_LINK_FAILED,
        '소셜 계정 연동 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(userId: string, dto: LogoutRequestDto) {
    const memberId = this.toBigIntId(userId);

    if (dto.refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: memberId,
          tokenHash: this.hashToken(dto.refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return null;
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: memberId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return null;
  }

  async refresh(dto: RefreshTokenRequestDto) {
    if (!dto.refreshToken) {
      throw new BusinessException(
        AuthErrorCode.REFRESH_TOKEN_REQUIRED,
        'refreshToken이 필요합니다.',
      );
    }

    const payload = this.verifyJwt(
      dto.refreshToken,
      'refresh',
      AuthErrorCode.REFRESH_TOKEN_INVALID,
      AuthErrorCode.REFRESH_TOKEN_EXPIRED,
    );
    const tokenHash = this.hashToken(dto.refreshToken);
    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !savedToken ||
      savedToken.revokedAt ||
      savedToken.userId !== this.toBigIntId(payload.sub)
    ) {
      throw new BusinessException(
        AuthErrorCode.REFRESH_TOKEN_INVALID,
        '유효하지 않은 refreshToken입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (savedToken.expiresAt.getTime() <= Date.now()) {
      throw new BusinessException(
        AuthErrorCode.REFRESH_TOKEN_EXPIRED,
        'refreshToken이 만료되었습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.assertActiveMember(savedToken.user);

    await this.prisma.refreshToken.update({
      where: { id: savedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(savedToken.user);
  }

  authenticateAccessToken(authorization: string): AuthenticatedUser {
    const [scheme, token] = authorization.split(' ');

    if (scheme !== this.tokenType || !token) {
      throw new BusinessException(
        AuthErrorCode.TOKEN_INVALID,
        '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = this.verifyJwt(
      token,
      'access',
      AuthErrorCode.TOKEN_INVALID,
      AuthErrorCode.TOKEN_EXPIRED,
    );

    return { id: payload.sub };
  }

  private assertProvider(provider?: string): OAuthProvider {
    if (provider !== 'kakao' && provider !== 'google') {
      throw new BusinessException(
        AuthErrorCode.AUTH_INVALID_PROVIDER,
        '지원하지 않는 소셜 로그인 제공자입니다.',
      );
    }

    return provider;
  }

  private assertSocialToken(socialToken?: string) {
    if (!socialToken) {
      throw new BusinessException(
        AuthErrorCode.AUTH_SOCIAL_TOKEN_REQUIRED,
        '소셜 로그인 토큰은 필수입니다.',
      );
    }

    return socialToken;
  }

  private async assertAccountLinkNotRequired(email: string | null) {
    if (!email) {
      return;
    }

    const member = await this.prisma.member.findUnique({
      where: { email },
      include: {
        socialAccounts: {
          orderBy: { id: 'asc' },
          take: 1,
        },
      },
    });

    if (member) {
      throw new BusinessException(
        AuthErrorCode.AUTH_ACCOUNT_LINK_REQUIRED,
        '동일한 이메일로 가입된 다른 소셜 계정이 존재합니다.',
        HttpStatus.CONFLICT,
        {
          existingProvider: this.toProviderResponse(
            member.socialAccounts[0]?.provider,
          ),
          maskedEmail: this.maskEmail(email),
        },
      );
    }
  }

  private async getSensitiveInfoAgreed(userId: bigint, fallback: string) {
    const consent = await this.prisma.memberConsent.findFirst({
      where: { userId, consentType: 'SENSITIVE' },
      orderBy: { id: 'desc' },
    });

    return consent?.agreed ?? this.toBoolean(fallback);
  }

  private async issueTokenPair(
    member: MemberResponseSource,
    client: Pick<Prisma.TransactionClient, 'refreshToken'> = this.prisma,
  ) {
    const accessExpiresIn = this.getAccessTokenExpiresIn();
    const refreshExpiresIn = this.getRefreshTokenExpiresIn();
    const accessToken = this.signJwt(member, 'access', accessExpiresIn);
    const refreshToken = this.signJwt(member, 'refresh', refreshExpiresIn);

    await client.refreshToken.create({
      data: {
        userId: member.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: this.tokenType,
      expiresIn: accessExpiresIn,
      refreshTokenExpiresIn: refreshExpiresIn,
    };
  }

  private signJwt(
    member: MemberResponseSource,
    type: JwtPayload['type'],
    expiresIn: number,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload =
      type === 'access'
        ? {
            sub: member.id.toString(),
            email: member.email,
            role: 'USER',
            type,
            iat: now,
            exp: now + expiresIn,
          }
        : {
            sub: member.id.toString(),
            sessionId: randomUUID(),
            type,
            iat: now,
            exp: now + expiresIn,
          };
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`, type);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyJwt(
    token: string,
    expectedType: JwtPayload['type'],
    invalidCode: AuthErrorCode,
    expiredCode: AuthErrorCode,
  ): JwtPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new BusinessException(
        invalidCode,
        expectedType === 'refresh'
          ? '유효하지 않은 refreshToken입니다.'
          : '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const [header, payload, signature] = parts;
    const expectedSignature = this.sign(`${header}.${payload}`, expectedType);

    if (!this.isEqualSignature(signature, expectedSignature)) {
      throw new BusinessException(
        invalidCode,
        expectedType === 'refresh'
          ? '유효하지 않은 refreshToken입니다.'
          : '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const parsedPayload = this.parseJwtPayload(
      payload,
      invalidCode,
      expectedType,
    );

    if (parsedPayload.type !== expectedType) {
      throw new BusinessException(
        invalidCode,
        expectedType === 'refresh'
          ? '유효하지 않은 refreshToken입니다.'
          : '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
      throw new BusinessException(
        expiredCode,
        expectedType === 'refresh'
          ? 'refreshToken이 만료되었습니다.'
          : 'token이 만료되었습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return parsedPayload;
  }

  private parseJwtPayload(
    encodedPayload: string,
    invalidCode: AuthErrorCode,
    expectedType: JwtPayload['type'],
  ): JwtPayload {
    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as JwtPayload;

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        !/^\d+$/.test(payload.sub) ||
        (payload.type !== 'access' && payload.type !== 'refresh') ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        throw new Error('Invalid JWT payload');
      }

      return payload;
    } catch {
      throw new BusinessException(
        invalidCode,
        expectedType === 'refresh'
          ? '유효하지 않은 refreshToken입니다.'
          : '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  private sign(value: string, type: JwtPayload['type']): string {
    return createHmac('sha256', this.getJwtSecret(type))
      .update(value)
      .digest('base64url');
  }

  private isEqualSignature(signature: string, expectedSignature: string) {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async fetchOAuthProfile(
    provider: OAuthProvider,
    socialToken: string,
  ): Promise<OAuthProfile> {
    return provider === 'google'
      ? this.fetchGoogleProfile(socialToken)
      : this.fetchKakaoProfile(socialToken);
  }

  private async fetchGoogleProfile(idToken: string): Promise<OAuthProfile> {
    let response: Response;

    try {
      response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
          idToken,
        )}`,
        { signal: AbortSignal.timeout(this.socialProviderTimeoutMs) },
      );
    } catch {
      throw new BusinessException(
        AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
        '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw new BusinessException(
        AuthErrorCode.AUTH_INVALID_SOCIAL_TOKEN,
        '유효하지 않은 소셜 로그인 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const aud = this.getString(json, 'aud');
    const providerId = this.getString(json, 'sub');

    if (!providerId || aud !== this.getRequiredEnv('GOOGLE_CLIENT_ID')) {
      throw new BusinessException(
        AuthErrorCode.AUTH_INVALID_SOCIAL_TOKEN,
        '유효하지 않은 소셜 로그인 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      providerId,
      email: this.getString(json, 'email'),
      emailVerified:
        json.email_verified === true || json.email_verified === 'true',
      nickname: this.getString(json, 'name') ?? '사용자',
      profileImage: this.getString(json, 'picture'),
    };
  }

  private async fetchKakaoProfile(accessToken: string): Promise<OAuthProfile> {
    let response: Response;

    try {
      response = await fetch(
        process.env.KAKAO_USER_INFO_URL ?? 'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `${this.tokenType} ${accessToken}`,
          },
          signal: AbortSignal.timeout(this.socialProviderTimeoutMs),
        },
      );
    } catch {
      throw new BusinessException(
        AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
        '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const providerId =
      typeof json.id === 'number' || typeof json.id === 'string'
        ? String(json.id)
        : null;

    if (!response.ok || !providerId) {
      const isInvalidSocialToken =
        response.status === 401 || response.status === 403;

      throw new BusinessException(
        isInvalidSocialToken
          ? AuthErrorCode.AUTH_INVALID_SOCIAL_TOKEN
          : AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
        isInvalidSocialToken
          ? '유효하지 않은 소셜 로그인 토큰입니다.'
          : '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
        isInvalidSocialToken ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
      );
    }

    const kakaoAccount = this.getObject(json, 'kakao_account');
    const profile = kakaoAccount
      ? this.getObject(kakaoAccount, 'profile')
      : null;

    return {
      providerId,
      email: kakaoAccount ? this.getString(kakaoAccount, 'email') : null,
      emailVerified:
        kakaoAccount?.is_email_verified === true &&
        kakaoAccount.is_email_valid !== false,
      nickname: profile
        ? (this.getString(profile, 'nickname') ?? '사용자')
        : '사용자',
      profileImage: profile
        ? (this.getString(profile, 'profile_image_url') ??
          this.getString(profile, 'thumbnail_image_url'))
        : null,
    };
  }

  private assertActiveMember(member: MemberResponseSource) {
    if (member.status === 'D') {
      throw new BusinessException(
        AuthErrorCode.AUTH_WITHDRAWN_USER,
        '탈퇴한 회원은 로그인할 수 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toMemberResponse(
    member: MemberResponseSource,
    sensitiveInfoAgreed = this.toBoolean(member.sensInfo),
  ) {
    return {
      id: Number(member.id),
      email: member.email,
      nickname: member.nickname,
      profileImage: member.profileImg,
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensitiveInfoAgreed,
    };
  }

  private isOnboardingCompleted(member: MemberResponseSource) {
    return Boolean(
      member.nickname &&
      member.gender &&
      member.ageGroup &&
      member.baselineType,
    );
  }

  private getAccessTokenExpiresIn() {
    return this.parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN ?? '3600');
  }

  private getRefreshTokenExpiresIn() {
    return this.parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN ?? '1209600');
  }

  private parseExpiresIn(value: string): number {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    const match = trimmedValue.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 3600;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplierByUnit: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };

    return amount * multiplierByUnit[unit];
  }

  private getJwtSecret(type: JwtPayload['type']) {
    const envKey =
      type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
    const fallbackValue = process.env[envKey] ?? process.env.JWT_SECRET;

    if (fallbackValue) {
      return fallbackValue;
    }

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    ) {
      return type === 'access'
        ? 'local-dev-access-secret-change-me'
        : 'local-dev-refresh-secret-change-me';
    }

    throw new BusinessException(
      AuthErrorCode.TOKEN_INVALID,
      'JWT 설정이 올바르지 않습니다.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private getRequiredEnv(key: string) {
    const value = process.env[key];

    if (!value) {
      throw new BusinessException(
        AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
        `${key} 환경변수가 필요합니다.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return value;
  }

  private getString(source: Record<string, unknown>, key: string) {
    const value = source[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private getObject(source: Record<string, unknown>, key: string) {
    const value = source[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private toProviderCode(provider: OAuthProvider): OAuthProviderCode {
    return provider === 'google' ? 'G' : 'K';
  }

  private toProviderResponse(provider?: string) {
    if (provider === 'K' || provider === 'kakao') {
      return 'KAKAO' as const;
    }

    if (provider === 'G' || provider === 'google') {
      return 'GOOGLE' as const;
    }

    return null;
  }

  private maskEmail(email: string | null) {
    if (!email) {
      return null;
    }

    const [localPart, domain] = email.split('@');
    if (!domain) {
      return email;
    }

    const visibleLength = Math.min(4, Math.max(1, localPart.length));
    return `${localPart.slice(0, visibleLength)}****@${domain}`;
  }

  private toBoolean(value: string) {
    return value === 'Y';
  }

  private toBigIntId(id: string) {
    return BigInt(id);
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
