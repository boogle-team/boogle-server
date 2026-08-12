import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import type { Prisma } from '@/generated/prisma/client';
import { BusinessException } from '@/common/exceptions/business.exception';
import { S3StorageService } from '@/common/storage/s3-storage.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthErrorCode } from './auth-error-code.enum';
import { AuthTemporaryTokenService } from './auth-temporary-token.service';
import { AccountLinkRequestDto } from './dto/account-link-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { OAuthCallbackQueryDto } from './dto/oauth-callback-query.dto';
import { OAuthResultExchangeRequestDto } from './dto/oauth-result-exchange-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';
import type {
  AuthTokenPairResponse,
  OAuthExchangeUserResponse,
  OAuthLoginSuccessResponse,
  OAuthResultExchangeResponse,
} from './types/oauth-result-exchange-response.type';

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
  provider: OAuthProvider;
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  nickname: string | null;
  profileImage: string | null;
}

interface OAuthStatePayload {
  provider: OAuthProvider;
  redirectUri: string;
  codeVerifier: string | null;
  frontendCallbackUrl: string;
}

type OAuthResultPayload = OAuthProfile;

interface AccountLinkPayload extends OAuthProfile {
  memberId: string;
}

interface MemberResponseSource {
  id: bigint;
  email: string | null;
  nickname: string | null;
  profileImg: string | null;
  profileImageKey: string | null;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly temporaryTokens: AuthTemporaryTokenService,
    private readonly storage: S3StorageService,
  ) {}

  async createAuthorizationUrl(
    providerValue: string,
    requestedFrontendOrigin?: string,
  ) {
    const provider = this.assertProvider(providerValue);

    try {
      const clientId = this.getProviderClientId(provider);
      const redirectUri = this.getProviderRedirectUri(provider);
      const frontendCallbackUrl = this.getFrontendOAuthCallbackUrl(
        requestedFrontendOrigin,
      );
      const stateExpiresIn = this.getOAuthStateExpiresIn();
      const codeVerifier =
        provider === 'google' ? randomBytes(48).toString('base64url') : null;
      const state = await this.temporaryTokens.create(
        'OAUTH_STATE',
        { provider, redirectUri, codeVerifier, frontendCallbackUrl },
        stateExpiresIn,
      );

      if (provider === 'google') {
        const authorizationUrl = new URL(
          process.env.GOOGLE_AUTHORIZATION_URL ??
            'https://accounts.google.com/o/oauth2/v2/auth',
        );
        authorizationUrl.search = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          state,
          code_challenge: this.toCodeChallenge(codeVerifier as string),
          code_challenge_method: 'S256',
          access_type: 'online',
          prompt: 'select_account',
        }).toString();
        return {
          authorizationUrl: authorizationUrl.toString(),
          state,
          stateExpiresIn,
        };
      }

      const authorizationUrl = new URL(
        process.env.KAKAO_AUTHORIZATION_URL ??
          'https://kauth.kakao.com/oauth/authorize',
      );
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
      }).toString();
      return {
        authorizationUrl: authorizationUrl.toString(),
        state,
        stateExpiresIn,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logError('createAuthorizationUrl', error);
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_STATE_CREATE_FAILED,
        '소셜 로그인 요청을 생성하지 못했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOAuthCallbackRedirect(
    providerValue: string,
    query: OAuthCallbackQueryDto,
    browserState?: string,
  ) {
    let frontendCallbackUrl: string | undefined;
    try {
      const provider = this.assertProvider(providerValue);

      if (
        !query.state ||
        !browserState ||
        !this.isEqualOpaqueValue(query.state, browserState)
      ) {
        throw new BusinessException(
          AuthErrorCode.AUTH_INVALID_STATE,
          '유효하지 않은 OAuth state입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const statePayload = await this.temporaryTokens.consume<unknown>(
        query.state,
        'OAUTH_STATE',
        {
          invalidCode: AuthErrorCode.AUTH_INVALID_STATE,
          invalidMessage: '유효하지 않은 OAuth state입니다.',
          expiredCode: AuthErrorCode.AUTH_STATE_EXPIRED,
          expiredMessage: 'OAuth 로그인 요청이 만료되었습니다.',
        },
      );
      const state = this.parseOAuthState(statePayload);
      frontendCallbackUrl = state.frontendCallbackUrl;

      if (state.provider !== provider) {
        throw new BusinessException(
          AuthErrorCode.AUTH_INVALID_STATE,
          '유효하지 않은 OAuth state입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (query.error) {
        throw new BusinessException(
          query.error === 'access_denied'
            ? AuthErrorCode.AUTH_OAUTH_ACCESS_DENIED
            : AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
          query.error === 'access_denied'
            ? '소셜 로그인 동의가 취소되었습니다.'
            : '소셜 로그인 제공자가 오류를 반환했습니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!query.code) {
        throw new BusinessException(
          AuthErrorCode.AUTH_AUTHORIZATION_CODE_REQUIRED,
          'authorization code가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const profile = await this.exchangeAuthorizationCode(
        provider,
        query.code,
        state,
      );
      const oauthResultCode = await this.temporaryTokens.create(
        'OAUTH_RESULT',
        profile,
        this.getOAuthResultExpiresIn(),
      );

      return this.buildFrontendOAuthCallbackUrl(
        { oauthResultCode },
        frontendCallbackUrl,
      );
    } catch (error) {
      const errorCode = this.toOAuthCallbackErrorCode(error);

      if (!(error instanceof BusinessException)) {
        this.logError('createOAuthCallbackRedirect', error);
      }

      return this.buildFrontendOAuthCallbackUrl(
        { error: errorCode },
        frontendCallbackUrl,
      );
    }
  }

  async exchangeOAuthResult(
    dto: OAuthResultExchangeRequestDto,
  ): Promise<OAuthResultExchangeResponse> {
    try {
      const rawPayload = await this.temporaryTokens.consume<unknown>(
        dto.oauthResultCode,
        'OAUTH_RESULT',
        {
          invalidCode: AuthErrorCode.AUTH_INVALID_OAUTH_RESULT_CODE,
          invalidMessage:
            '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
          expiredCode: AuthErrorCode.AUTH_OAUTH_RESULT_CODE_EXPIRED,
          expiredMessage:
            'OAuth 로그인 결과 코드가 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
        },
      );
      const profile = this.parseOAuthResult(rawPayload);

      if (!profile.emailVerified || !profile.email) {
        throw new BusinessException(
          AuthErrorCode.AUTH_UNVERIFIED_EMAIL,
          '소셜 로그인 제공자에서 인증된 이메일을 확인할 수 없습니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const verifiedEmail = profile.email;

      const exchangeResult = await this.prisma.$transaction(async (tx) => {
        const providerCode = this.toProviderCode(profile.provider);
        const socialAccount = await tx.socialAccount.findFirst({
          where: {
            provider: providerCode,
            providerId: profile.providerId,
          },
          include: { user: true },
        });

        if (socialAccount) {
          this.assertActiveMember(socialAccount.user);
          return {
            kind: 'login' as const,
            member: socialAccount.user,
            tokens: await this.issueTokenPair(socialAccount.user, tx),
            isNewUser: false,
          };
        }

        const member = await tx.member.findUnique({
          where: { email: verifiedEmail },
        });

        if (member) {
          this.assertActiveMember(member);
          const providerAlreadyLinked = await tx.socialAccount.findFirst({
            where: { userId: member.id, provider: providerCode },
          });

          if (providerAlreadyLinked) {
            throw new BusinessException(
              AuthErrorCode.SOCIAL_LOGIN_FAILED,
              '해당 제공자의 다른 소셜 계정이 이미 연결되어 있습니다.',
              HttpStatus.CONFLICT,
            );
          }

          return {
            kind: 'link' as const,
            member,
            profile,
          };
        }

        const createdMember = await tx.member.create({
          data: {
            email: verifiedEmail,
            nickname: null,
            profileImg: profile.profileImage,
            status: 'A',
            sensInfo: 'F',
          },
        });

        await tx.socialAccount.create({
          data: {
            userId: createdMember.id,
            provider: providerCode,
            providerId: profile.providerId,
            email: verifiedEmail,
          },
        });

        return {
          kind: 'login' as const,
          member: createdMember,
          tokens: await this.issueTokenPair(createdMember, tx),
          isNewUser: true,
        };
      });

      if (exchangeResult.kind === 'link') {
        const accountLinkTokenExpiresIn = this.getAccountLinkTokenExpiresIn();
        const accountLinkToken = await this.temporaryTokens.create(
          'ACCOUNT_LINK',
          {
            ...exchangeResult.profile,
            memberId: exchangeResult.member.id.toString(),
          } satisfies AccountLinkPayload,
          accountLinkTokenExpiresIn,
        );

        return {
          nextAction: 'ACCOUNT_LINK_REQUIRED',
          accountLinkToken,
          accountLinkTokenExpiresIn,
          provider: exchangeResult.profile.provider,
          email: verifiedEmail,
        };
      }

      return this.buildOAuthLoginResponse(
        exchangeResult.member,
        exchangeResult.tokens,
        exchangeResult.isNewUser,
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.SOCIAL_LOGIN_FAILED,
          '동일한 계정으로 소셜 로그인이 동시에 처리되었습니다. 다시 시도해주세요.',
          HttpStatus.CONFLICT,
        );
      }

      this.logError('exchangeOAuthResult', error);
      throw new BusinessException(
        AuthErrorCode.SOCIAL_LOGIN_FAILED,
        '소셜 로그인 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async linkOAuthAccount(
    dto: AccountLinkRequestDto,
  ): Promise<OAuthLoginSuccessResponse> {
    try {
      const rawPayload = await this.temporaryTokens.consume<unknown>(
        dto.accountLinkToken,
        'ACCOUNT_LINK',
        {
          invalidCode: AuthErrorCode.AUTH_INVALID_ACCOUNT_LINK_TOKEN,
          invalidMessage: '유효하지 않거나 이미 사용된 계정 연동 토큰입니다.',
          expiredCode: AuthErrorCode.AUTH_ACCOUNT_LINK_TOKEN_EXPIRED,
          expiredMessage:
            '계정 연동 요청이 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
        },
      );
      const payload = this.parseAccountLinkPayload(rawPayload);
      const providerCode = this.toProviderCode(payload.provider);

      const result = await this.prisma.$transaction(async (tx) => {
        const member = await tx.member.findUnique({
          where: { id: BigInt(payload.memberId) },
        });
        if (!member || member.email !== payload.email) {
          throw new BusinessException(
            AuthErrorCode.SOCIAL_LOGIN_FAILED,
            '소셜 계정을 연동할 수 없습니다.',
            HttpStatus.CONFLICT,
          );
        }
        this.assertActiveMember(member);

        const socialAccount = await tx.socialAccount.findFirst({
          where: {
            OR: [
              {
                provider: providerCode,
                providerId: payload.providerId,
              },
              { userId: member.id, provider: providerCode },
            ],
          },
        });
        if (socialAccount) {
          throw new BusinessException(
            AuthErrorCode.SOCIAL_LOGIN_FAILED,
            '소셜 계정을 연동할 수 없습니다.',
            HttpStatus.CONFLICT,
          );
        }

        await tx.socialAccount.create({
          data: {
            userId: member.id,
            provider: providerCode,
            providerId: payload.providerId,
            email: payload.email,
          },
        });

        return {
          member,
          tokens: await this.issueTokenPair(member, tx),
        };
      });

      return this.buildOAuthLoginResponse(result.member, result.tokens, false);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.SOCIAL_LOGIN_FAILED,
          '소셜 계정을 연동할 수 없습니다.',
          HttpStatus.CONFLICT,
        );
      }

      this.logError('linkOAuthAccount', error);
      throw new BusinessException(
        AuthErrorCode.SOCIAL_LOGIN_FAILED,
        '소셜 계정 연동 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(userId: string, dto: LogoutRequestDto) {
    const memberId = this.toBigIntId(userId);

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
    if (this.toBigIntId(payload.sub) !== memberId) {
      throw new BusinessException(
        AuthErrorCode.REFRESH_TOKEN_INVALID,
        '유효하지 않은 refreshToken입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!savedToken || savedToken.userId !== memberId || savedToken.revokedAt) {
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

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: savedToken.id, userId: memberId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
      throw new BusinessException(
        AuthErrorCode.REFRESH_TOKEN_INVALID,
        '유효하지 않은 refreshToken입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

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
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: savedToken.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });

      if (revoked.count !== 1) {
        throw new BusinessException(
          AuthErrorCode.REFRESH_TOKEN_INVALID,
          '유효하지 않은 refreshToken입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return this.issueTokenPair(savedToken.user, tx);
    });
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

  private async exchangeAuthorizationCode(
    provider: OAuthProvider,
    code: string,
    state: OAuthStatePayload,
  ) {
    return provider === 'google'
      ? this.exchangeGoogleAuthorizationCode(code, state)
      : this.exchangeKakaoAuthorizationCode(code, state);
  }

  private async exchangeGoogleAuthorizationCode(
    code: string,
    state: OAuthStatePayload,
  ): Promise<OAuthProfile> {
    const tokenResponse = await this.fetchOAuthToken(
      process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: this.getProviderClientId('google'),
        client_secret: this.getRequiredOAuthEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: state.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: state.codeVerifier ?? '',
      },
    );
    const accessToken = this.getString(tokenResponse, 'access_token');

    if (!accessToken) {
      throw this.invalidAuthorizationCode();
    }

    const userInfo = await this.fetchProviderJson(
      process.env.GOOGLE_USER_INFO_URL ??
        'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: `${this.tokenType} ${accessToken}` } },
    );
    const providerId = this.getString(userInfo, 'sub');

    if (!providerId) {
      throw this.socialProviderError();
    }

    return this.normalizeProfile({
      provider: 'google',
      providerId,
      email: this.getString(userInfo, 'email'),
      emailVerified:
        userInfo.email_verified === true || userInfo.email_verified === 'true',
      nickname: this.getString(userInfo, 'name') ?? '사용자',
      profileImage: this.getString(userInfo, 'picture'),
    });
  }

  private async exchangeKakaoAuthorizationCode(
    code: string,
    state: OAuthStatePayload,
  ): Promise<OAuthProfile> {
    const params: Record<string, string> = {
      code,
      client_id: this.getProviderClientId('kakao'),
      redirect_uri: state.redirectUri,
      grant_type: 'authorization_code',
    };
    const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim();
    if (clientSecret) {
      params.client_secret = clientSecret;
    }

    const tokenResponse = await this.fetchOAuthToken(
      process.env.KAKAO_TOKEN_URL ?? 'https://kauth.kakao.com/oauth/token',
      params,
    );
    const accessToken = this.getString(tokenResponse, 'access_token');

    if (!accessToken) {
      throw this.invalidAuthorizationCode();
    }

    const userInfo = await this.fetchProviderJson(
      process.env.KAKAO_USER_INFO_URL ?? 'https://kapi.kakao.com/v2/user/me',
      { headers: { Authorization: `${this.tokenType} ${accessToken}` } },
    );
    const providerId =
      typeof userInfo.id === 'number' || typeof userInfo.id === 'string'
        ? String(userInfo.id)
        : null;

    if (!providerId) {
      throw this.socialProviderError();
    }

    const kakaoAccount = this.getObject(userInfo, 'kakao_account');
    const kakaoProfile = kakaoAccount
      ? this.getObject(kakaoAccount, 'profile')
      : null;

    return this.normalizeProfile({
      provider: 'kakao',
      providerId,
      email: kakaoAccount ? this.getString(kakaoAccount, 'email') : null,
      emailVerified:
        kakaoAccount?.is_email_verified === true &&
        kakaoAccount.is_email_valid !== false,
      nickname: kakaoProfile
        ? (this.getString(kakaoProfile, 'nickname') ?? '사용자')
        : '사용자',
      profileImage: kakaoProfile
        ? (this.getString(kakaoProfile, 'profile_image_url') ??
          this.getString(kakaoProfile, 'thumbnail_image_url'))
        : null,
    });
  }

  private async fetchOAuthToken(url: string, params: Record<string, string>) {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(this.socialProviderTimeoutMs),
      });
    } catch {
      throw this.socialProviderError();
    }

    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw this.invalidAuthorizationCode();
      }
      throw this.socialProviderError();
    }

    return json;
  }

  private async fetchProviderJson(url: string, init: RequestInit) {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.socialProviderTimeoutMs),
      });
    } catch {
      throw this.socialProviderError();
    }

    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw this.socialProviderError();
    }

    return json;
  }

  private parseOAuthState(payload: unknown): OAuthStatePayload {
    if (!this.isRecord(payload)) {
      throw this.invalidOAuthState();
    }

    const provider = payload.provider;
    const redirectUri = payload.redirectUri;
    const codeVerifier = payload.codeVerifier;
    const frontendCallbackUrl = payload.frontendCallbackUrl;

    if (
      (provider !== 'google' && provider !== 'kakao') ||
      typeof redirectUri !== 'string' ||
      (codeVerifier !== null && typeof codeVerifier !== 'string') ||
      typeof frontendCallbackUrl !== 'string'
    ) {
      throw this.invalidOAuthState();
    }

    return { provider, redirectUri, codeVerifier, frontendCallbackUrl };
  }

  private parseOAuthResult(payload: unknown): OAuthResultPayload {
    if (!this.isRecord(payload)) {
      throw this.invalidOAuthResult();
    }

    const provider = payload.provider;
    const providerId = payload.providerId;
    const email = payload.email;
    const emailVerified = payload.emailVerified;
    const nickname = payload.nickname;
    const profileImage = payload.profileImage;

    if (
      (provider !== 'google' && provider !== 'kakao') ||
      typeof providerId !== 'string' ||
      (email !== null && typeof email !== 'string') ||
      typeof emailVerified !== 'boolean' ||
      (nickname !== null && typeof nickname !== 'string') ||
      (profileImage !== null && typeof profileImage !== 'string')
    ) {
      throw this.invalidOAuthResult();
    }

    return {
      provider,
      providerId,
      email,
      emailVerified,
      nickname,
      profileImage,
    };
  }

  private parseAccountLinkPayload(payload: unknown): AccountLinkPayload {
    if (!this.isRecord(payload) || typeof payload.memberId !== 'string') {
      throw this.invalidAccountLinkToken();
    }

    const provider = payload.provider;
    const providerId = payload.providerId;
    const email = payload.email;
    const emailVerified = payload.emailVerified;
    const nickname = payload.nickname;
    const profileImage = payload.profileImage;
    if (
      !/^\d+$/.test(payload.memberId) ||
      (provider !== 'google' && provider !== 'kakao') ||
      typeof providerId !== 'string' ||
      typeof email !== 'string' ||
      email.length === 0 ||
      emailVerified !== true ||
      (nickname !== null && typeof nickname !== 'string') ||
      (profileImage !== null && typeof profileImage !== 'string')
    ) {
      throw this.invalidAccountLinkToken();
    }

    return {
      memberId: payload.memberId,
      provider,
      providerId,
      email,
      emailVerified,
      nickname,
      profileImage,
    };
  }

  private normalizeProfile(profile: OAuthProfile): OAuthProfile {
    return {
      ...profile,
      email: profile.emailVerified ? profile.email : null,
    };
  }

  private buildFrontendOAuthCallbackUrl(
    params: Record<string, string>,
    callbackUrl?: string,
  ) {
    const rawUrl = callbackUrl ?? this.getFrontendOAuthCallbackUrl();

    if (!rawUrl) {
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_CONFIG_ERROR,
        'FRONTEND_OAUTH_CALLBACK_URL 환경변수가 필요합니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const url = new URL(rawUrl);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
      return url.toString();
    } catch {
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_CONFIG_ERROR,
        '프론트 OAuth 콜백 URL 설정이 올바르지 않습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getFrontendOAuthCallbackUrl(requestedOrigin?: string) {
    const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);

    if (requestedOrigin) {
      let normalizedOrigin: string;
      try {
        const url = new URL(requestedOrigin);
        normalizedOrigin = url.origin;
        if (
          url.href !== `${url.origin}/` ||
          !allowedOrigins.includes(url.origin)
        ) {
          throw new Error('not allowed');
        }
      } catch {
        throw new BusinessException(
          AuthErrorCode.AUTH_FRONTEND_ORIGIN_NOT_ALLOWED,
          '허용되지 않은 프론트 Origin입니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return `${normalizedOrigin}/oauth/callback`;
    }

    const configuredUrl = process.env.FRONTEND_OAUTH_CALLBACK_URL?.trim();
    if (configuredUrl) {
      return configuredUrl;
    }
    if (allowedOrigins[0]) {
      return `${allowedOrigins[0]}/oauth/callback`;
    }
    throw new BusinessException(
      AuthErrorCode.AUTH_OAUTH_CONFIG_ERROR,
      'FRONTEND_OAUTH_CALLBACK_URL 환경변수가 필요합니다.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private toOAuthCallbackErrorCode(error: unknown) {
    const callbackCodes = new Set<string>([
      AuthErrorCode.AUTH_OAUTH_ACCESS_DENIED,
      AuthErrorCode.AUTH_INVALID_STATE,
      AuthErrorCode.AUTH_STATE_EXPIRED,
      AuthErrorCode.AUTH_AUTHORIZATION_CODE_REQUIRED,
      AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
      AuthErrorCode.AUTH_OAUTH_CALLBACK_FAILED,
    ]);

    if (
      error instanceof BusinessException &&
      callbackCodes.has(error.errorCode)
    ) {
      return error.errorCode;
    }

    return AuthErrorCode.AUTH_OAUTH_CALLBACK_FAILED;
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

  private assertActiveMember(member: MemberResponseSource) {
    if (member.status === 'D') {
      throw new BusinessException(
        AuthErrorCode.AUTH_WITHDRAWN_USER,
        '탈퇴한 회원입니다.',
        HttpStatus.FORBIDDEN,
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
  ): Promise<AuthTokenPairResponse> {
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
  ) {
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
    const encodedHeader = this.base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
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
      throw this.invalidJwt(expectedType, invalidCode);
    }

    const [header, payload, signature] = parts;
    const expectedSignature = this.sign(`${header}.${payload}`, expectedType);
    if (!this.isEqualSignature(signature, expectedSignature)) {
      throw this.invalidJwt(expectedType, invalidCode);
    }

    const parsedPayload = this.parseJwtPayload(
      payload,
      invalidCode,
      expectedType,
    );
    if (parsedPayload.type !== expectedType) {
      throw this.invalidJwt(expectedType, invalidCode);
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
        !/^\d+$/.test(payload.sub) ||
        (payload.type !== 'access' && payload.type !== 'refresh') ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        throw new Error('Invalid JWT payload');
      }
      return payload;
    } catch {
      throw this.invalidJwt(expectedType, invalidCode);
    }
  }

  private invalidJwt(type: JwtPayload['type'], code: AuthErrorCode) {
    return new BusinessException(
      code,
      type === 'refresh'
        ? '유효하지 않은 refreshToken입니다.'
        : '유효하지 않은 token입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidOAuthState() {
    return new BusinessException(
      AuthErrorCode.AUTH_INVALID_STATE,
      '유효하지 않은 OAuth state입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidOAuthResult() {
    return new BusinessException(
      AuthErrorCode.AUTH_INVALID_OAUTH_RESULT_CODE,
      '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidAccountLinkToken() {
    return new BusinessException(
      AuthErrorCode.AUTH_INVALID_ACCOUNT_LINK_TOKEN,
      '유효하지 않거나 이미 사용된 계정 연동 토큰입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidAuthorizationCode() {
    return this.socialProviderError();
  }

  private socialProviderError() {
    return new BusinessException(
      AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
      '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async toMemberResponse(
    member: MemberResponseSource,
    sensitiveInfoAgreed = this.toBoolean(member.sensInfo),
  ): Promise<OAuthExchangeUserResponse> {
    let profileImage = member.profileImg;
    let profileImageSource: 'CUSTOM' | 'SOCIAL' | null = member.profileImg
      ? 'SOCIAL'
      : null;

    if (member.profileImageKey) {
      try {
        profileImage = await this.storage.getPublicUrl(member.profileImageKey);
        profileImageSource = 'CUSTOM';
      } catch (error) {
        this.logger.warn(
          '로그인 응답용 프로필 이미지 URL 발급에 실패했습니다.',
          error,
        );
      }
    }

    return {
      id: Number(member.id),
      email: member.email,
      nickname: member.nickname,
      profileImage,
      profileImageSource,
      gender: member.gender,
      ageGroup: member.ageGroup,
      baselineType: member.baselineType,
      sensitiveInfoAgreed,
    };
  }

  private async buildOAuthLoginResponse(
    member: MemberResponseSource,
    tokens: AuthTokenPairResponse,
    isNewUser: boolean,
  ): Promise<OAuthLoginSuccessResponse> {
    const onboardingCompleted = this.isOnboardingCompleted(member);
    const sensitiveInfoAgreed =
      member.gender === 'M'
        ? false
        : await this.getSensitiveInfoAgreed(member.id, member.sensInfo);
    const response = {
      ...tokens,
      isNewUser,
      user: await this.toMemberResponse(member, sensitiveInfoAgreed),
    };

    return onboardingCompleted
      ? { ...response, nextAction: 'HOME', onboardingCompleted: true }
      : {
          ...response,
          nextAction: 'ONBOARDING_REQUIRED',
          onboardingCompleted: false,
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

  private getProviderClientId(provider: OAuthProvider) {
    return this.getRequiredOAuthEnv(
      provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'KAKAO_CLIENT_ID',
    );
  }

  private getProviderRedirectUri(provider: OAuthProvider) {
    return this.getRequiredOAuthEnv(
      provider === 'google' ? 'GOOGLE_REDIRECT_URI' : 'KAKAO_REDIRECT_URI',
    );
  }

  private getRequiredOAuthEnv(key: string) {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_CONFIG_ERROR,
        `${key} 환경변수가 필요합니다.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return value;
  }

  private getOAuthStateExpiresIn() {
    return this.parseExpiresIn(
      process.env.OAUTH_STATE_EXPIRES_IN ?? '600',
      600,
    );
  }

  private getOAuthResultExpiresIn() {
    return this.parseExpiresIn(process.env.OAUTH_RESULT_EXPIRES_IN ?? '60', 60);
  }

  private getAccountLinkTokenExpiresIn() {
    return this.parseExpiresIn(
      process.env.ACCOUNT_LINK_TOKEN_EXPIRES_IN ?? '300',
      300,
    );
  }

  private getAccessTokenExpiresIn() {
    return this.parseExpiresIn(
      process.env.JWT_ACCESS_EXPIRES_IN ?? '3600',
      3600,
    );
  }

  private getRefreshTokenExpiresIn() {
    return this.parseExpiresIn(
      process.env.JWT_REFRESH_EXPIRES_IN ?? '1209600',
      1209600,
    );
  }

  private parseExpiresIn(value: string, fallback: number) {
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

  private getJwtSecret(type: JwtPayload['type']) {
    const envKey =
      type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
    const value = process.env[envKey] ?? process.env.JWT_SECRET;
    if (value) {
      return value;
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

  private toCodeChallenge(codeVerifier: string) {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private sign(value: string, type: JwtPayload['type']) {
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

  private isEqualOpaqueValue(value: string, expectedValue: string) {
    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expectedValue);
    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private toProviderCode(provider: OAuthProvider): OAuthProviderCode {
    return provider === 'google' ? 'G' : 'K';
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

  private logError(operation: string, error: unknown) {
    this.logger.error(
      `AuthService.${operation} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
