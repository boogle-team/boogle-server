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
import { PrismaService } from '@/prisma/prisma.service';
import { AuthErrorCode } from './auth-error-code.enum';
import { AuthTemporaryTokenService } from './auth-temporary-token.service';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { OAuthCallbackQueryDto } from './dto/oauth-callback-query.dto';
import { OAuthResultExchangeRequestDto } from './dto/oauth-result-exchange-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SocialLinkRequestDto } from './dto/social-link-request.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

type OAuthProvider = 'kakao' | 'google';
type OAuthProviderCode = 'K' | 'G';
type OAuthResultKind = 'LOGIN' | 'SIGNUP' | 'LINK';

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
}

interface OAuthResultPayload extends OAuthProfile {
  kind: OAuthResultKind;
  memberId: string | null;
  existingProvider: 'KAKAO' | 'GOOGLE' | null;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly temporaryTokens: AuthTemporaryTokenService,
  ) {}

  async createAuthorizationUrl(providerValue: string) {
    const provider = this.assertProvider(providerValue);

    try {
      const clientId = this.getProviderClientId(provider);
      const redirectUri = this.getProviderRedirectUri(provider);
      const codeVerifier =
        provider === 'google' ? randomBytes(48).toString('base64url') : null;
      const state = await this.temporaryTokens.create(
        'OAUTH_STATE',
        { provider, redirectUri, codeVerifier },
        this.getOAuthStateExpiresIn(),
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
        return authorizationUrl.toString();
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
      return authorizationUrl.toString();
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
  ) {
    try {
      const provider = this.assertProvider(providerValue);

      if (!query.state) {
        throw new BusinessException(
          AuthErrorCode.AUTH_OAUTH_STATE_INVALID,
          '유효하지 않은 OAuth state입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const statePayload = await this.temporaryTokens.consume<unknown>(
        query.state,
        'OAUTH_STATE',
        {
          invalidCode: AuthErrorCode.AUTH_OAUTH_STATE_INVALID,
          invalidMessage: '유효하지 않은 OAuth state입니다.',
          expiredCode: AuthErrorCode.AUTH_OAUTH_STATE_EXPIRED,
          expiredMessage: 'OAuth 로그인 요청이 만료되었습니다.',
        },
      );
      const state = this.parseOAuthState(statePayload);

      if (state.provider !== provider) {
        throw new BusinessException(
          AuthErrorCode.AUTH_OAUTH_STATE_INVALID,
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
          AuthErrorCode.AUTH_OAUTH_CODE_INVALID,
          '유효하지 않은 authorization code입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const profile = await this.exchangeAuthorizationCode(
        provider,
        query.code,
        state,
      );
      const result = await this.resolveOAuthResult(profile);
      const oauthResultCode = await this.temporaryTokens.create(
        'OAUTH_RESULT',
        result,
        this.getOAuthResultExpiresIn(),
      );

      return this.buildFrontendOAuthCallbackUrl({ oauthResultCode });
    } catch (error) {
      const errorCode = this.toOAuthCallbackErrorCode(error);

      if (!(error instanceof BusinessException)) {
        this.logError('createOAuthCallbackRedirect', error);
      }

      return this.buildFrontendOAuthCallbackUrl({ error: errorCode });
    }
  }

  async exchangeOAuthResult(dto: OAuthResultExchangeRequestDto) {
    try {
      const rawPayload = await this.temporaryTokens.consume<unknown>(
        dto.oauthResultCode,
        'OAUTH_RESULT',
        {
          invalidCode: AuthErrorCode.AUTH_OAUTH_RESULT_INVALID,
          invalidMessage:
            '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
          expiredCode: AuthErrorCode.AUTH_OAUTH_RESULT_EXPIRED,
          expiredMessage:
            'OAuth 로그인 결과 코드가 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
        },
      );
      const result = this.parseOAuthResult(rawPayload);

      if (result.kind === 'LOGIN') {
        const member = await this.findOAuthMember(result.memberId);
        this.assertActiveMember(member);
        const sensitiveInfoAgreed = await this.getSensitiveInfoAgreed(
          member.id,
          member.sensInfo,
        );

        return {
          nextAction: 'LOGIN_COMPLETED' as const,
          ...(await this.issueTokenPair(member)),
          isNewUser: false,
          onboardingCompleted: this.isOnboardingCompleted(member),
          user: this.toMemberResponse(member, sensitiveInfoAgreed),
        };
      }

      if (result.kind === 'LINK') {
        const linkTicket = await this.temporaryTokens.create(
          'LINK_TICKET',
          result,
          this.getAuthTicketExpiresIn(),
        );

        throw new BusinessException(
          AuthErrorCode.AUTH_ACCOUNT_LINK_REQUIRED,
          '동일한 이메일로 가입된 다른 소셜 계정이 존재합니다. 계정 연동이 필요합니다.',
          HttpStatus.CONFLICT,
          {
            linkTicket,
            linkTicketExpiresIn: this.getAuthTicketExpiresIn(),
            existingProvider: result.existingProvider,
            maskedEmail: this.maskEmail(result.email),
          },
        );
      }

      const signupTicket = await this.temporaryTokens.create(
        'SIGNUP_TICKET',
        result,
        this.getAuthTicketExpiresIn(),
      );

      return {
        nextAction: 'SIGNUP_REQUIRED' as const,
        signupTicket,
        signupTicketExpiresIn: this.getAuthTicketExpiresIn(),
        provider: this.toProviderResponse(result.provider),
        email: result.email,
        nickname: result.nickname,
        profileImage: result.profileImage,
        isNewUser: true,
        onboardingCompleted: false,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logError('exchangeOAuthResult', error);
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

      const rawPayload = await this.temporaryTokens.consume<unknown>(
        dto.signupTicket,
        'SIGNUP_TICKET',
        {
          invalidCode: AuthErrorCode.AUTH_SIGNUP_TICKET_INVALID,
          invalidMessage: '유효하지 않거나 이미 사용된 회원가입 티켓입니다.',
          expiredCode: AuthErrorCode.AUTH_SIGNUP_TICKET_EXPIRED,
          expiredMessage:
            '회원가입 티켓이 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
        },
      );
      const profile = this.parseOAuthResult(rawPayload);

      if (profile.kind !== 'SIGNUP') {
        throw new BusinessException(
          AuthErrorCode.AUTH_SIGNUP_TICKET_INVALID,
          '유효하지 않거나 이미 사용된 회원가입 티켓입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const providerCode = this.toProviderCode(profile.provider);
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

      if (profile.email) {
        const existingMember = await this.prisma.member.findUnique({
          where: { email: profile.email },
        });

        if (existingMember) {
          throw new BusinessException(
            AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_EXISTS,
            '이미 가입된 이메일입니다. 소셜 로그인을 다시 진행해주세요.',
            HttpStatus.CONFLICT,
          );
        }
      }

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

      this.logError('signup', error);
      throw new BusinessException(
        AuthErrorCode.SIGNUP_FAILED,
        '회원가입 처리 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async socialLink(dto: SocialLinkRequestDto) {
    try {
      const rawPayload = await this.temporaryTokens.consume<unknown>(
        dto.linkTicket,
        'LINK_TICKET',
        {
          invalidCode: AuthErrorCode.AUTH_LINK_TICKET_INVALID,
          invalidMessage: '유효하지 않거나 이미 사용된 계정 연동 티켓입니다.',
          expiredCode: AuthErrorCode.AUTH_LINK_TICKET_EXPIRED,
          expiredMessage:
            '계정 연동 티켓이 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
        },
      );
      const profile = this.parseOAuthResult(rawPayload);

      if (
        profile.kind !== 'LINK' ||
        !profile.memberId ||
        !profile.email ||
        !profile.emailVerified
      ) {
        throw new BusinessException(
          AuthErrorCode.AUTH_VERIFIED_EMAIL_REQUIRED,
          '인증된 이메일을 확인할 수 없습니다.',
        );
      }

      const providerCode = this.toProviderCode(profile.provider);
      const memberId = this.toBigIntId(profile.memberId);
      const existingSocialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          OR: [
            { provider: providerCode, providerId: profile.providerId },
            { userId: memberId, provider: providerCode },
          ],
        },
      });

      if (existingSocialAccount) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_LINKED,
          '이미 연결된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!member || member.email !== profile.email) {
        throw new BusinessException(
          AuthErrorCode.AUTH_USER_NOT_FOUND,
          '계정 연동 대상 회원을 찾을 수 없습니다.',
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
        })),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BusinessException(
          AuthErrorCode.AUTH_SOCIAL_ACCOUNT_ALREADY_LINKED,
          '이미 연결된 소셜 계정입니다.',
          HttpStatus.CONFLICT,
        );
      }

      this.logError('socialLink', error);
      throw new BusinessException(
        AuthErrorCode.SOCIAL_LINK_FAILED,
        '소셜 계정 연동 중 오류가 발생했습니다.',
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
        data: { revokedAt: new Date() },
      });
      return null;
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId: memberId, revokedAt: null },
      data: { revokedAt: new Date() },
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

  private async resolveOAuthResult(
    profile: OAuthProfile,
  ): Promise<OAuthResultPayload> {
    const providerCode = this.toProviderCode(profile.provider);
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: { provider: providerCode, providerId: profile.providerId },
      include: { user: true },
    });

    if (socialAccount) {
      return {
        ...profile,
        kind: 'LOGIN',
        memberId: socialAccount.user.id.toString(),
        existingProvider: null,
      };
    }

    if (profile.emailVerified && profile.email) {
      const member = await this.prisma.member.findUnique({
        where: { email: profile.email },
        include: {
          socialAccounts: { orderBy: { id: 'asc' }, take: 1 },
        },
      });

      if (member) {
        return {
          ...profile,
          kind: 'LINK',
          memberId: member.id.toString(),
          existingProvider: this.toProviderResponse(
            member.socialAccounts[0]?.provider,
          ),
        };
      }
    }

    return {
      ...profile,
      kind: 'SIGNUP',
      memberId: null,
      existingProvider: null,
    };
  }

  private async findOAuthMember(memberId: string | null) {
    if (!memberId || !/^\d+$/.test(memberId)) {
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_RESULT_INVALID,
        '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const member = await this.prisma.member.findUnique({
      where: { id: this.toBigIntId(memberId) },
    });

    if (!member) {
      throw new BusinessException(
        AuthErrorCode.AUTH_OAUTH_RESULT_INVALID,
        '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return member;
  }

  private parseOAuthState(payload: unknown): OAuthStatePayload {
    if (!this.isRecord(payload)) {
      throw this.invalidOAuthState();
    }

    const provider = payload.provider;
    const redirectUri = payload.redirectUri;
    const codeVerifier = payload.codeVerifier;

    if (
      (provider !== 'google' && provider !== 'kakao') ||
      typeof redirectUri !== 'string' ||
      (codeVerifier !== null && typeof codeVerifier !== 'string')
    ) {
      throw this.invalidOAuthState();
    }

    return { provider, redirectUri, codeVerifier };
  }

  private parseOAuthResult(payload: unknown): OAuthResultPayload {
    if (!this.isRecord(payload)) {
      throw this.invalidOAuthResult();
    }

    const kind = payload.kind;
    const provider = payload.provider;
    const providerId = payload.providerId;
    const email = payload.email;
    const emailVerified = payload.emailVerified;
    const nickname = payload.nickname;
    const profileImage = payload.profileImage;
    const memberId = payload.memberId;
    const existingProvider = payload.existingProvider;

    if (
      (kind !== 'LOGIN' && kind !== 'SIGNUP' && kind !== 'LINK') ||
      (provider !== 'google' && provider !== 'kakao') ||
      typeof providerId !== 'string' ||
      (email !== null && typeof email !== 'string') ||
      typeof emailVerified !== 'boolean' ||
      (nickname !== null && typeof nickname !== 'string') ||
      (profileImage !== null && typeof profileImage !== 'string') ||
      (memberId !== null && typeof memberId !== 'string') ||
      (existingProvider !== null &&
        existingProvider !== 'KAKAO' &&
        existingProvider !== 'GOOGLE')
    ) {
      throw this.invalidOAuthResult();
    }

    return {
      kind,
      provider,
      providerId,
      email,
      emailVerified,
      nickname,
      profileImage,
      memberId,
      existingProvider,
    };
  }

  private normalizeProfile(profile: OAuthProfile): OAuthProfile {
    return {
      ...profile,
      email: profile.emailVerified ? profile.email : null,
    };
  }

  private buildFrontendOAuthCallbackUrl(params: Record<string, string>) {
    const configuredUrl = process.env.FRONTEND_OAUTH_CALLBACK_URL?.trim();
    const frontendOrigin = process.env.FRONTEND_ORIGIN?.split(',')[0]?.trim();
    const rawUrl =
      configuredUrl ||
      (frontendOrigin ? `${frontendOrigin}/oauth/callback` : null);

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

  private toOAuthCallbackErrorCode(error: unknown) {
    const callbackCodes = new Set<string>([
      AuthErrorCode.AUTH_OAUTH_ACCESS_DENIED,
      AuthErrorCode.AUTH_OAUTH_STATE_INVALID,
      AuthErrorCode.AUTH_OAUTH_STATE_EXPIRED,
      AuthErrorCode.AUTH_OAUTH_CODE_INVALID,
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
      AuthErrorCode.AUTH_OAUTH_STATE_INVALID,
      '유효하지 않은 OAuth state입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidOAuthResult() {
    return new BusinessException(
      AuthErrorCode.AUTH_OAUTH_RESULT_INVALID,
      '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private invalidAuthorizationCode() {
    return new BusinessException(
      AuthErrorCode.AUTH_OAUTH_CODE_INVALID,
      '유효하지 않은 authorization code입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private socialProviderError() {
    return new BusinessException(
      AuthErrorCode.AUTH_SOCIAL_PROVIDER_ERROR,
      '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
      HttpStatus.BAD_GATEWAY,
    );
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

  private getAuthTicketExpiresIn() {
    return this.parseExpiresIn(
      process.env.AUTH_TICKET_EXPIRES_IN ?? '600',
      600,
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

  private logError(operation: string, error: unknown) {
    this.logger.error(
      `AuthService.${operation} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
