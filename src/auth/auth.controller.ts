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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { SocialLoginRequestDto } from './dto/social-login-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
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
  socialLogin(@Body() dto: SocialLoginRequestDto) {
    return this.authService.socialLogin(dto);
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
  refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto);
  }
}
