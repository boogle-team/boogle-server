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
import { SensitiveInfoConsentDataDto } from './dto/sensitive-info-consent-response.dto';
import { UpdateSensitiveInfoConsentRequestDto } from './dto/update-sensitive-info-consent-request.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';
import { NotificationSettingsResponseDto } from './dto/notification-settings-response.dto';
import { DeleteMeRequestDto } from './dto/delete-me-request.dto';
import type { ProfileImageFile } from './profile-image.service';
import { ProfileImageUploadExceptionFilter } from './filters/profile-image-upload-exception.filter';
import {
  DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_TOO_LARGE_MESSAGE,
} from './profile-image.constants';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { errorExamples } from '@/common/swagger/error-example.util';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import {
  MeResponseDto,
  OnboardingStatusResponseDto,
  ProfileImageResponseDto,
  SaveOnboardingResponseDto,
  UserProfileResponseDto,
} from './dto/user-response.dto';
import { TOKEN_ERROR_EXAMPLES } from '@/common/swagger/auth-error-examples.constant';

const USER_NOT_FOUND_EXAMPLE = {
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
};

const USER_WITHDRAWN_EXAMPLE = {
  USER_WITHDRAWN: '탈퇴한 회원입니다.',
};

const PROFILE_IMAGE_400_EXAMPLES = {
  PROFILE_IMAGE_REQUIRED: '프로필 이미지 파일은 필수입니다.',
  PROFILE_IMAGE_INVALID_FORMAT: '지원하지 않는 프로필 이미지 형식입니다.',
};

const PROFILE_IMAGE_500_EXAMPLES = {
  PROFILE_IMAGE_UPLOAD_FAILED: '프로필 이미지를 저장하지 못했습니다.',
  PROFILE_IMAGE_UPDATE_FAILED: '프로필 이미지 정보를 변경하지 못했습니다.',
  PROFILE_IMAGE_ACCESS_FAILED: '프로필 이미지를 불러오지 못했습니다.',
};

@ApiTags('온보딩, 계정 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('me/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '온보딩 정보 저장',
    description:
      '최초 1회 닉네임과 기본 프로필을 저장합니다. gender가 F 또는 N이면 민감정보 동의 여부와 정책 버전도 함께 전송해야 합니다.',
  })
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
  @ApiSuccessResponse({
    type: SaveOnboardingResponseDto,
    description: '온보딩 정보 저장 성공',
    message: '온보딩 정보가 저장되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '프로필 입력값 또는 이미지 형식 오류',
    examples: errorExamples({
      NICKNAME_REQUIRED: 'nickname은 필수입니다.',
      NICKNAME_TOO_LONG: 'nickname은 최대 10자까지 입력할 수 있습니다.',
      INVALID_GENDER: 'gender 값이 올바르지 않습니다.',
      INVALID_AGE_GROUP: 'ageGroup 값이 올바르지 않습니다.',
      INVALID_BASELINE_TYPE: 'baselineType 값이 올바르지 않습니다.',
      SENSITIVE_INFO_AGREEMENT_INVALID:
        '민감정보 수집 동의 여부를 선택해주세요.',
      POLICY_VERSION_REQUIRED: '민감정보 동의문 버전은 필수입니다.',
      PROFILE_IMAGE_INVALID_FORMAT:
        PROFILE_IMAGE_400_EXAMPLES.PROFILE_IMAGE_INVALID_FORMAT,
    }),
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: '이미 온보딩을 완료했거나 닉네임이 중복됨',
    examples: errorExamples({
      ONBOARDING_ALREADY_COMPLETED: '이미 온보딩을 완료한 사용자입니다.',
      NICKNAME_ALREADY_EXISTS: '이미 사용 중인 닉네임입니다.',
    }),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
    examples: errorExamples({
      PROFILE_IMAGE_TOO_LARGE: PROFILE_IMAGE_TOO_LARGE_MESSAGE,
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '프로필 이미지 저장 또는 URL 발급 실패',
    examples: errorExamples(PROFILE_IMAGE_500_EXAMPLES),
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
  @ApiOperation({
    summary: '온보딩 정보 조회',
    description:
      '현재 프로필 입력값과 민감정보 동의 여부, 온보딩 완료 여부를 조회합니다.',
  })
  @ApiSuccessResponse({
    type: OnboardingStatusResponseDto,
    description: '온보딩 정보 조회 성공',
    message: '온보딩 정보 조회에 성공했습니다.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '프로필 이미지 URL 발급 실패',
    examples: errorExamples({
      PROFILE_IMAGE_ACCESS_FAILED:
        PROFILE_IMAGE_500_EXAMPLES.PROFILE_IMAGE_ACCESS_FAILED,
    }),
  })
  @GenericUnauthorized()
  @ResponseMessage('온보딩 정보 조회에 성공했습니다.')
  getOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getOnboarding(user.id);
  }

  @Get('me')
  @ApiOperation({
    summary: '내 정보 조회',
    description: '프로필, 온보딩 상태, 연결된 소셜 계정과 가입일을 조회합니다.',
  })
  @ApiSuccessResponse({
    type: MeResponseDto,
    description: '내 정보 조회 성공',
    message: '내 정보 조회에 성공했습니다.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '프로필 이미지 URL 발급 실패',
    examples: errorExamples({
      PROFILE_IMAGE_ACCESS_FAILED:
        PROFILE_IMAGE_500_EXAMPLES.PROFILE_IMAGE_ACCESS_FAILED,
    }),
  })
  @GenericUnauthorized()
  @ResponseMessage('내 정보 조회에 성공했습니다.')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMe(user.id);
  }

  @Get('me/notification-settings')
  @ApiOperation({
    summary: '알림 설정 조회',
    description:
      '기록·리포트·위험 신호 알림의 on/off 설정을 조회합니다. 저장값이 없으면(레거시) 기본값 Y로 폴백해 항상 Y 또는 N을 반환합니다.',
  })
  @ApiSuccessResponse({
    type: NotificationSettingsResponseDto,
    description: '알림 설정 조회 성공',
    message: '알림 설정을 조회했습니다.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @GenericUnauthorized()
  @ResponseMessage('알림 설정을 조회했습니다.')
  getNotificationSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getNotificationSettings(user.id);
  }

  @Patch('me/notification-settings')
  @ApiOperation({
    summary: '알림 설정 변경',
    description:
      '전달된 필드만 변경하고(단일 필드 부분 변경), 변경 후 전체 설정값을 반환합니다.',
  })
  @ApiBody({ type: UpdateNotificationSettingsRequestDto })
  @ApiSuccessResponse({
    type: NotificationSettingsResponseDto,
    description: '알림 설정 변경 성공(변경 후 전체 설정 반환)',
    message: '알림 설정이 변경되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '알림 값이 Y/N이 아님',
    examples: errorExamples({
      BAD_REQUEST: '요청 값이 올바르지 않습니다.',
    }),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @GenericUnauthorized()
  @ResponseMessage('알림 설정이 변경되었습니다.')
  updateNotificationSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationSettingsRequestDto,
  ) {
    return this.userService.updateNotificationSettings(user.id, dto);
  }

  @Get('me/sensitive-info-consent')
  @ApiOperation({
    summary: '민감정보 수집 동의 조회',
    description:
      '현재 동의 여부와 정책 버전, 최근 동의·철회 시각을 조회합니다. gender가 F 또는 N인 사용자만 사용할 수 있습니다.',
  })
  @ApiSuccessResponse({
    type: SensitiveInfoConsentDataDto,
    description: '민감정보 수집 동의 상태 조회 성공',
    message: '민감정보 수집 동의 상태 조회에 성공했습니다.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '민감정보 동의 기능 사용 불가',
    examples: errorExamples({
      ...USER_WITHDRAWN_EXAMPLE,
      SENSITIVE_INFO_NOT_AVAILABLE:
        '현재 성별 설정에서는 민감정보 수집 동의 기능을 사용할 수 없습니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @GenericUnauthorized()
  @ResponseMessage('민감정보 수집 동의 상태 조회에 성공했습니다.')
  getSensitiveInfoConsent(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getSensitiveInfoConsent(user.id);
  }

  @Patch('me/sensitive-info-consent')
  @ApiOperation({
    summary: '민감정보 수집 동의 변경',
    description:
      '민감정보 동의를 변경합니다. 철회 시 기존 생활 기록의 호르몬 관련 값도 제거합니다.',
  })
  @ApiBody({ type: UpdateSensitiveInfoConsentRequestDto })
  @ApiSuccessResponse({
    type: SensitiveInfoConsentDataDto,
    description:
      '민감정보 수집 동의 변경 성공. 철회 시 응답 message는 민감정보 수집 동의가 철회되었습니다.',
    message: '민감정보 수집에 동의했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '동의 여부 또는 정책 버전 오류',
    examples: errorExamples({
      SENSITIVE_INFO_AGREEMENT_INVALID: 'agreed는 boolean 값이어야 합니다.',
      POLICY_VERSION_REQUIRED: 'policyVersion은 필수입니다.',
    }),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원 또는 민감정보 동의 기능 사용 불가',
    examples: errorExamples({
      ...USER_WITHDRAWN_EXAMPLE,
      SENSITIVE_INFO_NOT_AVAILABLE:
        '현재 성별 설정에서는 민감정보 수집 동의 기능을 사용할 수 없습니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
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
  @ApiOperation({
    summary: '내 정보 수정',
    description:
      '전달한 필드만 변경하고 변경 후 전체 프로필을 반환합니다. gender를 M으로 변경하면 민감정보 동의를 철회하고 호르몬 기록을 제거합니다.',
  })
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
  @ApiSuccessResponse({
    type: UserProfileResponseDto,
    description: '내 정보 수정 성공',
    message: '내 정보 수정에 성공했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '프로필 입력값 또는 이미지 형식 오류',
    examples: errorExamples({
      NICKNAME_REQUIRED: 'nickname은 빈 문자열일 수 없습니다.',
      NICKNAME_TOO_LONG: 'nickname은 최대 10자까지 입력할 수 있습니다.',
      INVALID_GENDER: 'gender 값이 올바르지 않습니다.',
      INVALID_AGE_GROUP: 'ageGroup 값이 올바르지 않습니다.',
      INVALID_BASELINE_TYPE: 'baselineType 값이 올바르지 않습니다.',
      PROFILE_IMAGE_INVALID_FORMAT:
        PROFILE_IMAGE_400_EXAMPLES.PROFILE_IMAGE_INVALID_FORMAT,
    }),
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: '닉네임 중복',
    examples: errorExamples({
      NICKNAME_ALREADY_EXISTS: '이미 사용 중인 닉네임입니다.',
    }),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
    examples: errorExamples({
      PROFILE_IMAGE_TOO_LARGE: PROFILE_IMAGE_TOO_LARGE_MESSAGE,
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '프로필 이미지 저장·정보 변경·URL 발급 실패',
    examples: errorExamples(PROFILE_IMAGE_500_EXAMPLES),
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
  @ApiOperation({
    summary: '프로필 이미지 등록 또는 교체',
    description:
      'JPEG, PNG 또는 WebP 이미지 한 개를 등록합니다. 성공하면 접근 가능한 이미지 URL을 반환합니다.',
  })
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
  @ApiSuccessResponse({
    type: ProfileImageResponseDto,
    description: '프로필 이미지 등록 또는 교체 성공',
    message: '프로필 이미지가 변경되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '이미지 누락 또는 지원하지 않는 이미지 형식',
    examples: errorExamples(PROFILE_IMAGE_400_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponseDto,
    description: `PROFILE_IMAGE_TOO_LARGE: ${PROFILE_IMAGE_TOO_LARGE_MESSAGE}`,
    examples: errorExamples({
      PROFILE_IMAGE_TOO_LARGE: PROFILE_IMAGE_TOO_LARGE_MESSAGE,
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '프로필 이미지 저장·정보 변경·URL 발급 실패',
    examples: errorExamples(PROFILE_IMAGE_500_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @GenericUnauthorized()
  @ResponseMessage('프로필 이미지가 변경되었습니다.')
  updateProfileImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() image?: ProfileImageFile,
  ) {
    return this.userService.updateProfileImage(user.id, image);
  }

  @Delete('me')
  @ApiOperation({
    summary: '회원탈퇴',
    description:
      '확인 문구를 검증한 뒤 회원과 연관된 기록·토큰·소셜 계정 데이터를 삭제합니다.',
  })
  @ApiOkResponse({
    description: '회원탈퇴 성공',
    schema: {
      example: {
        success: true,
        data: null,
        message: '회원탈퇴가 완료되었습니다.',
      },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: '탈퇴 확인 문구 또는 탈퇴 사유 오류',
    examples: errorExamples({
      WITHDRAWAL_CONFIRMATION_INVALID:
        '회원탈퇴 확인 문구가 올바르지 않습니다.',
      BAD_REQUEST: '요청 값이 올바르지 않습니다.',
    }),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '사용자를 찾을 수 없음',
    examples: errorExamples(USER_NOT_FOUND_EXAMPLE),
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: '탈퇴한 회원',
    examples: errorExamples(USER_WITHDRAWN_EXAMPLE),
  })
  @ApiBody({ type: DeleteMeRequestDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'access token 누락·유효하지 않음·만료',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @GenericUnauthorized()
  @ResponseMessage('회원탈퇴가 완료되었습니다.')
  deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteMeRequestDto,
  ) {
    return this.userService.deleteMe(user.id, dto);
  }
}
