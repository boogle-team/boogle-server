import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from './report.service';
import { ReportErrorCode } from './report-error-code.enum';

describe('ReportService', () => {
  let service: ReportService;

  const prismaMock = {
    member: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    boogleRecord: {
      findMany: jest.fn(),
    },
    lifeRecord: {
      findMany: jest.fn(),
    },
    weeklyRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    monthlyRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    guide: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    guideFeedback: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('잘못된 주 시작일 형식은 REPORT_INVALID_DATE_FORMAT을 반환한다', async () => {
    await expect(
      service.getWeeklyReport(1n, {
        weekStartDate: '2026/07/20',
      }),
    ).rejects.toMatchObject({
      errorCode: ReportErrorCode.REPORT_INVALID_DATE_FORMAT,
    });
  });

  it('월요일이 아닌 주 시작일은 REPORT_INVALID_DATE_RANGE를 반환한다', async () => {
    await expect(
      service.getWeeklyReport(1n, {
        weekStartDate: '2026-07-21',
      }),
    ).rejects.toMatchObject({
      errorCode: ReportErrorCode.REPORT_INVALID_DATE_RANGE,
    });
  });

  jest.mock('./pdf/monthly-pdf.renderer', () => ({
    renderMonthlyPdf: jest
      .fn()
      .mockResolvedValue(Buffer.from('%PDF-test', 'ascii')),
  }));
});
