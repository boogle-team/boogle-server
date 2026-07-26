import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';

describe('ReportController', () => {
  let controller: ReportController;

  const reportServiceMock = {
    getWeeklyReport: jest.fn(),
    getMonthlyReport: jest.fn(),
    createPdfReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: reportServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportController>(ReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  function getResponseMessage(prototype: object, methodName: string): unknown {
    const method: unknown = Reflect.get(prototype, methodName);

    if (typeof method !== 'function') {
      throw new Error(`${methodName} is not a method`);
    }

    return Reflect.getMetadata(RESPONSE_MESSAGE_KEY, method) as
      string | undefined;
  }

  it('Report 조회 성공 메시지 metadata가 API 명세와 일치한다', () => {
    expect(
      getResponseMessage(ReportController.prototype, 'getWeeklyReport'),
    ).toBe('주간 리포트 조회에 성공했습니다.');

    expect(
      getResponseMessage(ReportController.prototype, 'getMonthlyReport'),
    ).toBe('월간 리포트 조회에 성공했습니다.');

    expect(
      getResponseMessage(ReportController.prototype, 'createPdfReport'),
    ).toBeUndefined();
  });
});
