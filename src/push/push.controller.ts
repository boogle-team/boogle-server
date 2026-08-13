import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpStatus as Status } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { errorExamples } from '@/common/swagger/error-example.util';
import { DeletePushTokenDto } from './dto/delete-push-token.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import {
  DeletePushTokenResponseDto,
  RegisterPushTokenResponseDto,
} from './dto/push-token-response.dto';
import { PushService } from './push.service';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const BODY_ERROR_EXAMPLES = {
  BAD_REQUEST: '요청 값이 올바르지 않습니다.',
};

@ApiTags('Push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('tokens')
  @ApiOperation({
    summary: '푸시 토큰 등록',
    description:
      'FCM에서 발급받은 기기 토큰을 현재 사용자에 등록한다. token 기준 멱등 upsert이며, 같은 기기가 다른 계정으로 로그인하면 소유자만 갱신된다.',
  })
  @ApiSuccessResponse({
    type: RegisterPushTokenResponseDto,
    status: Status.CREATED,
    description: '푸시 토큰 등록 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'token 누락 / 빈 문자열 / 512자 초과 / 문자열 아님',
    examples: errorExamples(BODY_ERROR_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  registerToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushService.registerToken(user.id, dto.token);
  }

  @Delete('tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '푸시 토큰 해제',
    description:
      '로그아웃/알림 끄기 시 현재 사용자의 해당 기기 토큰을 해제한다. 이미 없던 토큰이어도 성공(멱등)하며, 다른 사용자가 재등록한 토큰은 지우지 않는다.',
  })
  @ApiSuccessResponse({
    type: DeletePushTokenResponseDto,
    description: '푸시 토큰 해제 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'token 누락 / 빈 문자열 / 512자 초과 / 문자열 아님',
    examples: errorExamples(BODY_ERROR_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  deleteToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeletePushTokenDto,
  ) {
    return this.pushService.deleteToken(user.id, dto.token);
  }
}
