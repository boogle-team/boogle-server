import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { errorExamples } from '@/common/swagger/error-example.util';
import {
  NotificationListResponseDto,
  NotificationReadResponseDto,
} from './dto/notification-response.dto';
import { NotificationService } from './notification.service';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const SERVER_ERROR_EXAMPLES = {
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
};

@ApiTags('알림')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: '알림 목록 조회',
    description:
      '사용자의 알림 목록과 안읽음 개수를 발생 일시 내림차순으로 반환합니다. type은 아이콘 매핑용, linkTo는 탭 시 이동 화면입니다.',
  })
  @ApiSuccessResponse({
    type: NotificationListResponseDto,
    description: '알림 목록 조회 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '알림 목록 조회 중 서버 오류',
    examples: errorExamples(SERVER_ERROR_EXAMPLES),
  })
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getNotifications(user.id);
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary: '알림 읽음 처리',
    description:
      '알림 배너를 탭했을 때 해당 알림을 읽음 처리하고, 갱신된 안읽음 개수를 함께 반환합니다. 이미 읽은 알림을 다시 호출해도 동일하게 응답합니다(멱등).',
  })
  @ApiParam({
    name: 'notificationId',
    type: Number,
    required: true,
    description: '읽음 처리할 알림 ID (alarm_map.id)',
    schema: { type: 'integer', minimum: 1, example: 5001 },
  })
  @ApiSuccessResponse({
    type: NotificationReadResponseDto,
    description: '알림 읽음 처리 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'notificationId가 숫자가 아님',
    examples: errorExamples({
      BAD_REQUEST: '요청 값이 올바르지 않습니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '존재하지 않거나 로그인 사용자의 알림이 아님(소유 검증 실패)',
    examples: errorExamples({
      NOTIFICATION_NOT_FOUND: '알림을 찾을 수 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '알림 읽음 처리 중 서버 오류',
    examples: errorExamples(SERVER_ERROR_EXAMPLES),
  })
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationService.markAsRead(user.id, notificationId);
  }
}
