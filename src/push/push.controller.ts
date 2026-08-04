import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { DeletePushTokenDto } from './dto/delete-push-token.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushService } from './push.service';

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
  deleteToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeletePushTokenDto,
  ) {
    return this.pushService.deleteToken(user.id, dto.token);
  }
}
