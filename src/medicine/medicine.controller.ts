import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { errorExamples } from '@/common/swagger/error-example.util';
import { MedicineService } from './medicine.service';
import { MedicineListResponseDto } from './dto/medicine-list-response.dto';
import { MedicineListQueryDto } from './dto/medicine-list-query.dto';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

@ApiTags('약/영양제 목록 (생활 기록 등록 시 참조)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medicines')
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Get()
  @ApiOperation({
    summary: '약/영양제 목록 조회',
    description:
      'keyword를 보내면 약/영양제명에 해당 문자열이 포함된 항목만 필터링합니다. keyword 없이 호출하면 전체 목록을 반환합니다. 생활기록 생성/수정 시 medicineIds에 넣을 약/영양제 ID를 조회할 때 사용합니다.',
  })
  @ResponseMessage('약/영양제 목록 조회에 성공했습니다.')
  @ApiOkResponse({
    type: MedicineListResponseDto,
    description:
      '약/영양제 목록 조회 성공 (keyword로 이름 부분 일치 검색 가능)',
  })
  @ApiUnauthorizedResponse({
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    description: '약/영양제 목록 조회 중 오류 발생(MEDICINE_LIST_READ_FAILED)',
    examples: errorExamples({
      MEDICINE_LIST_READ_FAILED: '약/영양제 목록 조회 중 오류가 발생했습니다.',
    }),
  })
  findAll(
    @CurrentUser() _user: AuthenticatedUser,
    @Query() query: MedicineListQueryDto,
  ): Promise<MedicineListResponseDto> {
    return this.medicineService.findAll(query.keyword);
  }
}
