import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { errorExamples } from '@/common/swagger/error-example.util';
import { HealthResponseDto } from './dto/app-response.dto';

@ApiTags('시스템')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '서버 동작 확인',
    description:
      '서버 프로세스가 요청을 받을 수 있는 상태인지만 가볍게 확인합니다. DB 등 다른 리소스는 확인하지 않으므로, DB 연결까지 포함해 확인하려면 /health를 사용하세요. 인증이 필요 없습니다.',
  })
  @ResponseMessage('요청이 성공적으로 처리되었습니다.')
  @ApiOkResponse({
    description: '서버가 정상적으로 응답 중',
    schema: {
      example: {
        success: true,
        data: 'Hello World!',
        message: '요청이 성공적으로 처리되었습니다.',
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: '헬스 체크 (서버 + DB)',
    description:
      '서버뿐 아니라 DB(RDS) 연결까지 확인합니다. 내부적으로 SELECT 1 쿼리를 실행하기 때문에, 이 API가 200을 반환하면 서버-DB 연결이 모두 정상이라는 뜻입니다. 배포 후 컨테이너 헬스체크나 모니터링 용도로 사용합니다. 인증이 필요 없습니다.',
  })
  @ResponseMessage('서버가 정상적으로 동작 중입니다.')
  @ApiOkResponse({
    description: '서버 및 DB 연결 정상',
    schema: {
      example: {
        success: true,
        data: { status: 'ok' },
        message: '서버가 정상적으로 동작 중입니다.',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description:
      'DB 연결 실패 등으로 서버가 정상 동작하지 않음(INTERNAL_SERVER_ERROR). 이 응답이 오면 서버 또는 DB에 장애가 있는 것이므로 즉시 확인이 필요합니다.',
    examples: errorExamples({
      INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    }),
  })
  async getHealth(): Promise<HealthResponseDto> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
