import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiPayloadTooLargeResponse,
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
import type { ProfileImageFile } from './profile-image.service';
import { ProfileImageUploadExceptionFilter } from './filters/profile-image-upload-exception.filter';
import {
  DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_TOO_LARGE_MESSAGE,
} from './profile-image.constants';

@ApiTags('온보딩, 계정 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('me/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '온보딩 정보 저장' })
  @ApiConsumes('multipart/form-data')
  @UseFilters(ProfileImageUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      limits: { fileSize: DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES },
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nickname', 'gender', 'ageGroup', 'baselineType'],
      properties: {
        nickname: { type: 'string', maxLength: 10, example: '부글이' },
        profileImage: {
          type: 'string',
          format: 'binary',
          description: '선택 이미지(JPEG, PNG, WebP), 최대 50MB',
        },
        gender: { type: 'string', enum: ['M', 'F', 'N'], example: 'F' },
        ageGroup: { type: 'integer', enum: [10, 20, 30, 40], example: 20 },
        baselineType: {
          type: 'string',
          enum: ['R', 'C', 'L', 'U'],
          example: 'R',
        },
        sensitiveInfoAgreed: {
          type: 'boolean',
          example: false,
          description: 'gender가 F 또는 N일 때 필수',
        },
        sensitiveInfoPolicyVersion: {
          type: 'string',
          example: '2026-07-01',
          description: 'gender가 F 또는 N일 때 필수',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
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
  @ApiPayloadTooLargeResponse({
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
  })
  @GenericUnauthorized()
  @ResponseMessage('온보딩 정보가 저장되었습니다.')
  saveOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveOnboardingRequestDto,
    @UploadedFile() profileImage?: ProfileImageFile,
  ) {
    return this.userService.saveOnboarding(user.id, dto, profileImage);
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
  @ApiForbiddenResponse({
    description: '민감정보 동의 기능 사용 불가',
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
  @ApiConsumes('multipart/form-data')
  @UseFilters(ProfileImageUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      limits: { fileSize: DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES },
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nickname: { type: 'string', maxLength: 10, example: '부글이' },
        profileImage: {
          type: 'string',
          format: 'binary',
          description: '선택 이미지(JPEG, PNG, WebP), 최대 50MB',
        },
        gender: { type: 'string', enum: ['M', 'F', 'N'] },
        ageGroup: { type: 'integer', enum: [10, 20, 30, 40] },
        baselineType: { type: 'string', enum: ['R', 'C', 'L', 'U'] },
      },
    },
  })
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
  @ApiPayloadTooLargeResponse({
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
  })
  @GenericUnauthorized()
  @ResponseMessage('내 정보 수정에 성공했습니다.')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeRequestDto,
    @UploadedFile() profileImage?: ProfileImageFile,
  ) {
    return this.userService.updateMe(user.id, dto, profileImage);
  }

  @Put('me/profile-image')
  @ApiOperation({ summary: '프로필 이미지 등록 또는 교체' })
  @ApiConsumes('multipart/form-data')
  @UseFilters(ProfileImageUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES },
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '필수 이미지(JPEG, PNG, WebP), 최대 50MB',
        },
      },
    },
  })
  @ApiOkResponse({
    description: '프로필 이미지 등록 또는 교체 성공',
    schema: {
      example: {
        success: true,
        data: {
          profileImage: 'https://cdn.example.com/profile-images/users/1/id.jpg',
          profileImageSource: 'CUSTOM',
        },
        message: '프로필 이미지가 변경되었습니다.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '이미지 누락 또는 지원하지 않는 이미지 형식',
  })
  @ApiPayloadTooLargeResponse({
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
  })
  @ApiInternalServerErrorResponse({ description: 'S3 이미지 저장 실패' })
  @ApiUnauthorizedResponse({ description: '로그인이 필요함' })
  @GenericUnauthorized()
  @ResponseMessage('프로필 이미지가 변경되었습니다.')
  updateProfileImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() image?: ProfileImageFile,
  ) {
    return this.userService.updateProfileImage(user.id, image);
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
