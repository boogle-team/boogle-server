import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SocialLinkRequestDto } from './dto/social-link-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('회원가입, 로그인')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 로그인/회원가입' })
  @ApiBody({ type: SocialLoginRequestDto })
  @ApiOkResponse({
    description: '소셜 로그인/회원가입 성공',
  })
  @ApiBadRequestResponse({
    description: '지원하지 않는 provider 또는 socialToken 누락',
  })
  @ApiUnauthorizedResponse({
    description: '유효하지 않은 소셜 로그인 토큰',
  })
  @ApiConflictResponse({
    description: '동일 이메일로 가입된 다른 소셜 계정 존재',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiBadGatewayResponse({
    description: '소셜 로그인 제공자 통신 오류',
  })
  @ApiInternalServerErrorResponse({
    description: '소셜 로그인 처리 실패',
  })
  @ResponseMessage<{ isNewUser: boolean }>((data) =>
    data.isNewUser
      ? '회원가입을 위해 개인정보 동의가 필요합니다.'
      : '로그인에 성공했습니다.',
  )
  socialLogin(@Body() dto: SocialLoginRequestDto) {
    return this.authService.socialLogin(dto);
  }

  @Post('signup')
  @ApiOperation({ summary: '소셜 회원가입' })
  @ApiBody({ type: SignupRequestDto })
  @ApiCreatedResponse({ description: '회원가입 성공' })
  @ApiBadRequestResponse({
    description: '개인정보 수집 미동의 또는 잘못된 요청',
  })
  @ApiUnauthorizedResponse({ description: '유효하지 않은 소셜 토큰' })
  @ApiConflictResponse({
    description: '이미 가입된 소셜 계정 또는 계정 연동 필요',
  })
  @ApiBadGatewayResponse({ description: '소셜 로그인 제공자 통신 오류' })
  @ResponseMessage('회원가입이 완료되었습니다. 온보딩을 진행해주세요.')
  signup(@Body() dto: SignupRequestDto) {
    return this.authService.signup(dto);
  }

  @Post('social-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '기존 회원 소셜 계정 연동' })
  @ApiBody({ type: SocialLinkRequestDto })
  @ApiOkResponse({ description: '소셜 계정 연동 성공' })
  @ApiBadRequestResponse({ description: '인증된 이메일 누락 또는 잘못된 요청' })
  @ApiUnauthorizedResponse({ description: '유효하지 않은 소셜 토큰' })
  @ApiConflictResponse({ description: '이미 연동된 소셜 계정' })
  @ApiNotFoundResponse({ description: '연동할 기존 회원을 찾을 수 없음' })
  @ApiBadGatewayResponse({ description: '소셜 로그인 제공자 통신 오류' })
  @ResponseMessage('소셜 계정이 연동되었습니다.')
  socialLink(@Body() dto: SocialLinkRequestDto) {
    return this.authService.socialLink(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiBody({ type: LogoutRequestDto, required: false })
  @ApiOkResponse({
    description: '로그아웃 성공',
  })
  @ApiUnauthorizedResponse({
    description: 'token 누락 또는 유효하지 않은 token',
  })
  @ResponseMessage('로그아웃에 성공했습니다.')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutRequestDto,
  ) {
    return this.authService.logout(user.id, dto ?? {});
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 재발급' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiOkResponse({
    description: '토큰 재발급 성공',
  })
  @ApiBadRequestResponse({
    description: 'refreshToken 누락',
  })
  @ApiUnauthorizedResponse({
    description: '유효하지 않거나 만료된 refreshToken',
  })
  @ResponseMessage('토큰 재발급에 성공했습니다.')
  refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto);
  }
}
