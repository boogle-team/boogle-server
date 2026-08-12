import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { AccountLinkRequestDto } from './dto/account-link-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { OAuthCallbackQueryDto } from './dto/oauth-callback-query.dto';
import { OAuthResultExchangeRequestDto } from './dto/oauth-result-exchange-request.dto';
import { OAuthStartQueryDto } from './dto/oauth-start-query.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { errorExamples } from '@/common/swagger/error-example.util';
import {
  AccountLinkRequiredResponseDto,
  AuthTokenPairResponseDto,
  OAuthLoginResponseDto,
} from './dto/auth-response.dto';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const REFRESH_TOKEN_ERROR_EXAMPLES = {
  REFRESH_TOKEN_INVALID: '유효하지 않은 refreshToken입니다.',
  REFRESH_TOKEN_EXPIRED: 'refreshToken이 만료되었습니다.',
};

@ApiTags('회원가입, 로그인')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('oauth/:provider')
  @ApiOperation({
    summary: '소셜 로그인 시작',
    description:
      'OAuth state 쿠키를 설정한 뒤 선택한 소셜 제공자의 인증 페이지로 리다이렉트합니다.',
  })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'kakao'],
    description: '소셜 로그인 제공자',
  })
  @ApiFoundResponse({
    description: 'Google 또는 Kakao OAuth 인증 페이지로 이동',
    headers: {
      Location: {
        description: '소셜 제공자의 OAuth 인증 URL',
        schema: { type: 'string', format: 'uri' },
      },
      'Set-Cookie': {
        description: '콜백 검증에 사용하는 HttpOnly OAuth state 쿠키',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '지원하지 않는 OAuth 제공자',
    examples: errorExamples({
      AUTH_INVALID_PROVIDER: '지원하지 않는 소셜 로그인 제공자입니다.',
      AUTH_OAUTH_CONFIG_ERROR: '허용되지 않은 프론트 Origin입니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'OAuth 설정 또는 state 생성 실패',
    examples: errorExamples({
      AUTH_OAUTH_CONFIG_ERROR: 'OAuth 서버 설정이 올바르지 않습니다.',
      AUTH_OAUTH_STATE_CREATE_FAILED: '소셜 로그인 요청을 생성하지 못했습니다.',
    }),
  })
  async startOAuth(
    @Param('provider') provider: string,
    @Query() query: OAuthStartQueryDto,
    @Res() response: Response,
  ) {
    const { authorizationUrl, state, stateExpiresIn } =
      await this.authService.createAuthorizationUrl(
        provider,
        query.frontendOrigin,
      );
    response.cookie(this.getOAuthStateCookieName(provider), state, {
      ...this.getOAuthStateCookieOptions(provider),
      maxAge: stateExpiresIn * 1000,
    });
    return response.redirect(HttpStatus.FOUND, authorizationUrl);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({
    summary: '소셜 로그인 OAuth 콜백',
    description:
      '소셜 제공자 전용 콜백입니다. 성공하면 oauthResultCode, 실패하면 error 코드를 쿼리에 담아 프론트 콜백 URL로 리다이렉트합니다. 앱에서 직접 호출하지 않습니다.',
  })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'kakao'],
    description: '소셜 로그인 제공자',
  })
  @ApiFoundResponse({
    description:
      '프론트로 이동. 성공 쿼리: oauthResultCode, 실패 쿼리: error(AUTH_OAUTH_ACCESS_DENIED, AUTH_INVALID_STATE, AUTH_STATE_EXPIRED, AUTH_AUTHORIZATION_CODE_REQUIRED, AUTH_SOCIAL_PROVIDER_ERROR, AUTH_OAUTH_CALLBACK_FAILED)',
    headers: {
      Location: {
        description: 'OAuth 처리 결과를 포함한 프론트 콜백 URL',
        schema: {
          type: 'string',
          format: 'uri',
          example:
            'https://app.example.com/oauth/callback?oauthResultCode=one-time-code',
        },
      },
      'Set-Cookie': {
        description: 'OAuth state 쿠키 제거(Max-Age=0)',
        schema: { type: 'string' },
      },
    },
  })
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query() query: OAuthCallbackQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const cookieName = this.getOAuthStateCookieName(provider);
    try {
      const redirectUrl = await this.authService.createOAuthCallbackRedirect(
        provider,
        query,
        this.readCookie(request, cookieName),
      );
      return response.redirect(HttpStatus.FOUND, redirectUrl);
    } finally {
      response.clearCookie(
        cookieName,
        this.getOAuthStateCookieOptions(provider),
      );
    }
  }

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '소셜 로그인 결과 교환',
    description:
      'OAuth 콜백에서 받은 일회용 코드를 로그인 토큰으로 교환합니다. 동일 이메일의 기존 계정이 있으면 토큰 대신 계정 연동 정보를 반환합니다.',
  })
  @ApiBody({ type: OAuthResultExchangeRequestDto })
  @ApiExtraModels(OAuthLoginResponseDto, AccountLinkRequiredResponseDto)
  @ApiOkResponse({
    description: '로그인 성공 또는 동일 이메일 계정 연동 필요',
    schema: {
      type: 'object',
      required: ['success', 'data', 'message'],
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          oneOf: [
            { $ref: getSchemaPath(OAuthLoginResponseDto) },
            { $ref: getSchemaPath(AccountLinkRequiredResponseDto) },
          ],
          discriminator: {
            propertyName: 'nextAction',
            mapping: {
              HOME: getSchemaPath(OAuthLoginResponseDto),
              ONBOARDING_REQUIRED: getSchemaPath(OAuthLoginResponseDto),
              ACCOUNT_LINK_REQUIRED: getSchemaPath(
                AccountLinkRequiredResponseDto,
              ),
            },
          },
        },
        message: { type: 'string', example: '로그인했습니다.' },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'OAuth 결과 코드 누락',
    examples: errorExamples({
      AUTH_OAUTH_RESULT_CODE_REQUIRED: 'OAuth 로그인 결과 코드는 필수입니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: '유효하지 않거나 만료된 결과 코드 또는 미검증 이메일',
    examples: errorExamples({
      AUTH_INVALID_OAUTH_RESULT_CODE:
        '유효하지 않거나 이미 사용된 OAuth 로그인 결과 코드입니다.',
      AUTH_OAUTH_RESULT_CODE_EXPIRED:
        'OAuth 로그인 결과 코드가 만료되었습니다. 소셜 로그인을 다시 진행해주세요.',
      AUTH_UNVERIFIED_EMAIL:
        '소셜 로그인 제공자에서 인증된 이메일을 확인할 수 없습니다.',
    }),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples({ AUTH_WITHDRAWN_USER: '탈퇴한 회원입니다.' }),
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: '소셜 계정 중복 또는 동시 로그인 충돌',
    examples: errorExamples({
      SOCIAL_LOGIN_FAILED:
        '해당 제공자의 다른 소셜 계정이 이미 연결되어 있습니다.',
    }),
  })
  @ApiBadGatewayResponse({
    type: ErrorResponseDto,
    description: '소셜 제공자 통신 실패',
    examples: errorExamples({
      AUTH_SOCIAL_PROVIDER_ERROR:
        '소셜 로그인 제공자와 통신 중 오류가 발생했습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '소셜 로그인 처리 실패',
    examples: errorExamples({
      SOCIAL_LOGIN_FAILED: '소셜 로그인 처리 중 오류가 발생했습니다.',
    }),
  })
  @ResponseMessage<{
    nextAction: 'HOME' | 'ONBOARDING_REQUIRED' | 'ACCOUNT_LINK_REQUIRED';
  }>((data) => {
    if (data.nextAction === 'ACCOUNT_LINK_REQUIRED') {
      return '동일한 이메일로 가입된 계정이 있습니다. 계정 연동 여부를 선택해주세요.';
    }
    return data.nextAction === 'ONBOARDING_REQUIRED'
      ? '로그인했습니다. 프로필을 입력해주세요.'
      : '로그인했습니다.';
  })
  exchangeOAuthResult(@Body() dto: OAuthResultExchangeRequestDto) {
    return this.authService.exchangeOAuthResult(dto);
  }

  @Post('oauth/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '동일 이메일 소셜 계정 연동',
    description:
      '소셜 로그인 결과 교환에서 ACCOUNT_LINK_REQUIRED와 함께 받은 일회용 토큰으로 기존 계정에 새 소셜 계정을 연결합니다.',
  })
  @ApiBody({ type: AccountLinkRequestDto })
  @ApiSuccessResponse({
    type: OAuthLoginResponseDto,
    description: '계정 연동 및 로그인 성공',
    message: '소셜 계정이 연동되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '계정 연동 토큰 누락',
    examples: errorExamples({
      AUTH_ACCOUNT_LINK_TOKEN_REQUIRED: 'accountLinkToken은 필수입니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: '유효하지 않음·사용 완료·만료된 계정 연동 토큰',
    examples: errorExamples({
      AUTH_INVALID_ACCOUNT_LINK_TOKEN:
        '유효하지 않거나 이미 사용된 계정 연동 토큰입니다.',
      AUTH_ACCOUNT_LINK_TOKEN_EXPIRED: '계정 연동 토큰이 만료되었습니다.',
    }),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples({ AUTH_WITHDRAWN_USER: '탈퇴한 회원입니다.' }),
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: '이미 연결된 소셜 계정',
    examples: errorExamples({
      SOCIAL_LOGIN_FAILED: '소셜 계정을 연동할 수 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '소셜 계정 연동 처리 실패',
    examples: errorExamples({
      SOCIAL_LOGIN_FAILED: '소셜 계정 연동 중 오류가 발생했습니다.',
    }),
  })
  @ResponseMessage('소셜 계정이 연동되었습니다.')
  linkOAuthAccount(@Body() dto: AccountLinkRequestDto) {
    return this.authService.linkOAuthAccount(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '로그아웃',
    description:
      'Authorization 헤더의 access token을 검증하고 요청 본문의 refresh token을 현재 세션에서 무효화합니다.',
  })
  @ApiBody({ type: LogoutRequestDto })
  @ApiOkResponse({
    description: '로그아웃 성공',
    schema: {
      example: { success: true, data: null, message: '로그아웃되었습니다.' },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'refreshToken 누락',
    examples: errorExamples({
      REFRESH_TOKEN_REQUIRED: 'refreshToken이 필요합니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 또는 refresh token 오류',
    examples: errorExamples({
      ...TOKEN_ERROR_EXAMPLES,
      ...REFRESH_TOKEN_ERROR_EXAMPLES,
    }),
  })
  @ResponseMessage('로그아웃되었습니다.')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutRequestDto,
  ) {
    return this.authService.logout(user.id, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 재발급',
    description:
      '유효한 refresh token을 한 번만 사용해 기존 토큰을 폐기하고 새 access/refresh token 쌍을 발급합니다.',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiSuccessResponse({
    type: AuthTokenPairResponseDto,
    description: '토큰 재발급 성공',
    message: '토큰이 재발급되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'refreshToken 누락',
    examples: errorExamples({
      REFRESH_TOKEN_REQUIRED: 'refreshToken이 필요합니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: '유효하지 않거나 만료된 refreshToken',
    examples: errorExamples(REFRESH_TOKEN_ERROR_EXAMPLES),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples({ USER_WITHDRAWN: '탈퇴한 회원입니다.' }),
  })
  @ResponseMessage('토큰이 재발급되었습니다.')
  refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto);
  }

  private getOAuthStateCookieName(provider: string) {
    return `boogle_oauth_state_${provider}`;
  }

  private getOAuthStateCookieOptions(provider: string): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: `/api/v1/auth/oauth/${provider}/callback`,
    };
  }

  private readCookie(request: Request, name: string) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    for (const cookie of cookieHeader.split(';')) {
      const [cookieName, ...valueParts] = cookie.trim().split('=');
      if (cookieName === name) {
        try {
          return decodeURIComponent(valueParts.join('='));
        } catch {
          return undefined;
        }
      }
    }

    return undefined;
  }
}
