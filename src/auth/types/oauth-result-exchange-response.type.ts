export interface OAuthExchangeUserResponse {
  id: number;
  email: string | null;
  nickname: string | null;
  profileImage: string | null;
  profileImageSource: 'CUSTOM' | 'SOCIAL' | null;
  gender: string | null;
  ageGroup: number | null;
  baselineType: string | null;
  sensitiveInfoAgreed: boolean;
}

export interface AuthTokenPairResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshTokenExpiresIn: number;
}

interface OAuthResultExchangeBase extends AuthTokenPairResponse {
  isNewUser: boolean;
  user: OAuthExchangeUserResponse;
}

export type OAuthLoginSuccessResponse =
  | (OAuthResultExchangeBase & {
      nextAction: 'HOME';
      onboardingCompleted: true;
    })
  | (OAuthResultExchangeBase & {
      nextAction: 'ONBOARDING_REQUIRED';
      onboardingCompleted: false;
    });

export interface OAuthAccountLinkRequiredResponse {
  nextAction: 'ACCOUNT_LINK_REQUIRED';
  accountLinkToken: string;
  accountLinkTokenExpiresIn: number;
  provider: 'google' | 'kakao';
  email: string;
}

export type OAuthResultExchangeResponse =
  OAuthLoginSuccessResponse | OAuthAccountLinkRequiredResponse;
