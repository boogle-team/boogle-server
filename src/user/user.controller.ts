import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GenericUnauthorized } from '@/common/decorators/generic-unauthorized.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { UserService } from './user.service';
import { SaveOnboardingRequestDto } from './dto/save-onboarding-request.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';
import { SensitiveInfoConsentSuccessResponseDto } from './dto/sensitive-info-consent-response.dto';
import { UpdateSensitiveInfoConsentRequestDto } from './dto/update-sensitive-info-consent-request.dto';
import { DeleteMeRequestDto } from './dto/delete-me-request.dto';

@ApiTags('온보딩, 계정 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('me/onboarding')
  @ApiOperation({ summary: '온보딩 정보 저장' })
  @ApiBody({ type: SaveOnboardingRequestDto })
  @ApiResponse({
    status: 201,
    description: '온보딩 정보 저장 성공',
  })
  @ApiConflictResponse({
    description: '이미 온보딩을 완료한 사용자',
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('온보딩 정보가 저장되었습니다.')
  saveOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveOnboardingRequestDto,
  ) {
    return this.userService.saveOnboarding(user.id, dto);
  }

  @Get('me/onboarding')
  @ApiOperation({ summary: '온보딩 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '온보딩 정보 조회 성공',
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('온보딩 정보 조회에 성공했습니다.')
  getOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getOnboarding(user.id);
  }

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '내 정보 조회 성공',
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('내 정보 조회에 성공했습니다.')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMe(user.id);
  }

  @Get('me/sensitive-info-consent')
  @ApiOperation({ summary: '민감정보 수집 동의 조회' })
  @ApiOkResponse({
    description: '민감정보 수집 동의 상태 조회 성공',
    type: SensitiveInfoConsentSuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiUnauthorizedResponse({
    description: '로그인이 필요함',
  })
  @GenericUnauthorized()
  @ResponseMessage('민감정보 수집 동의 상태 조회에 성공했습니다.')
  getSensitiveInfoConsent(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getSensitiveInfoConsent(user.id);
  }

  @Patch('me/sensitive-info-consent')
  @ApiOperation({ summary: '민감정보 수집 동의 변경' })
  @ApiBody({ type: UpdateSensitiveInfoConsentRequestDto })
  @ApiOkResponse({
    description: '민감정보 수집 동의 변경 성공',
    type: SensitiveInfoConsentSuccessResponseDto,
  })
  @ApiNotFoundResponse({ description: '사용자를 찾을 수 없음' })
  @ApiForbiddenResponse({ description: '민감정보 동의 기능 사용 불가' })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage<{ agreed: boolean }>((data) =>
    data.agreed
      ? '민감정보 수집에 동의했습니다.'
      : '민감정보 수집 동의가 철회되었습니다.',
  )
  updateSensitiveInfoConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSensitiveInfoConsentRequestDto,
  ) {
    return this.userService.updateSensitiveInfoConsent(user.id, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: '내 정보 수정' })
  @ApiBody({ type: UpdateMeRequestDto })
  @ApiResponse({
    status: 200,
    description: '내 정보 수정 성공',
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('내 정보 수정에 성공했습니다.')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeRequestDto,
  ) {
    return this.userService.updateMe(user.id, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: '회원탈퇴' })
  @ApiResponse({
    status: 200,
    description: '회원탈퇴 성공',
  })
  @ApiNotFoundResponse({
    description: '사용자를 찾을 수 없음',
  })
  @ApiForbiddenResponse({
    description: '탈퇴한 회원',
  })
  @ApiBody({ type: DeleteMeRequestDto })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('회원탈퇴가 완료되었습니다.')
  deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteMeRequestDto,
  ) {
    return this.userService.deleteMe(user.id, dto);
  }
}
