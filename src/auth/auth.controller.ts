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
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { OAuthCallbackQueryDto } from './dto/oauth-callback-query.dto';
import { OAuthResultExchangeRequestDto } from './dto/oauth-result-exchange-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('회원가입, 로그인')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('oauth/:provider')
  @ApiOperation({ summary: '소셜 로그인 시작' })
  @ApiParam({ name: 'provider', enum: ['google', 'kakao'] })
  @ApiFoundResponse({
    description: 'Google 또는 Kakao OAuth 인증 페이지로 이동',
  })
  @ApiBadRequestResponse({ description: '지원하지 않는 OAuth 제공자' })
  @ApiInternalServerErrorResponse({ description: 'OAuth 요청 생성 실패' })
  async startOAuth(
    @Param('provider') provider: string,
    @Res() response: Response,
  ) {
    const { authorizationUrl, state, stateExpiresIn } =
      await this.authService.createAuthorizationUrl(provider);
    response.cookie(this.getOAuthStateCookieName(provider), state, {
      ...this.getOAuthStateCookieOptions(provider),
      maxAge: stateExpiresIn * 1000,
    });
    return response.redirect(HttpStatus.FOUND, authorizationUrl);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: '소셜 로그인 OAuth 콜백' })
  @ApiParam({ name: 'provider', enum: ['google', 'kakao'] })
  @ApiFoundResponse({
    description: '일회용 OAuth 결과 코드 또는 오류 코드와 함께 프론트로 이동',
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
  @ApiOperation({ summary: '소셜 로그인 결과 교환' })
  @ApiBody({ type: OAuthResultExchangeRequestDto })
  @ApiOkResponse({
    description: '로그인 성공 및 HOME 또는 ONBOARDING_REQUIRED 이동 정보',
  })
  @ApiBadRequestResponse({ description: 'OAuth 결과 코드 누락' })
  @ApiUnauthorizedResponse({
    description: '유효하지 않거나 만료된 결과 코드 또는 미검증 이메일',
  })
  @ApiForbiddenResponse({ description: '탈퇴한 회원' })
  @ResponseMessage<{ nextAction: 'HOME' | 'ONBOARDING_REQUIRED' }>((data) =>
    data.nextAction === 'ONBOARDING_REQUIRED'
      ? '로그인했습니다. 프로필을 입력해주세요.'
      : '로그인했습니다.',
  )
  exchangeOAuthResult(@Body() dto: OAuthResultExchangeRequestDto) {
    return this.authService.exchangeOAuthResult(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiBody({ type: LogoutRequestDto })
  @ApiOkResponse({ description: '로그아웃 성공' })
  @ApiUnauthorizedResponse({ description: '누락·유효하지 않음·만료된 토큰' })
  @ResponseMessage('로그아웃되었습니다.')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutRequestDto,
  ) {
    return this.authService.logout(user.id, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 재발급' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiOkResponse({ description: '토큰 재발급 성공' })
  @ApiBadRequestResponse({ description: 'refreshToken 누락' })
  @ApiUnauthorizedResponse({
    description: '유효하지 않거나 만료된 refreshToken',
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
