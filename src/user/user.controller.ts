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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { UserService } from './user.service';
import { SaveOnboardingRequestDto } from './dto/save-onboarding-request.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';

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
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMe(user.id);
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
  deleteMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.deleteMe(user.id);
  }
}
