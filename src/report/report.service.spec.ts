import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from './report.service';
import { ReportErrorCode } from './report-error-code.enum';
import { BoogleRecordForReport } from './dto/report-record.dto';
import * as monthlyPdfRenderer from './pdf/monthly-pdf.renderer';

function kstDate(dateKey: string, time = '09:00'): Date {
  return new Date(`${dateKey}T${time}:00.000+09:00`);
}

function createBoogleRecord(
  dateKey: string,
  overrides: Partial<BoogleRecordForReport> = {},
): BoogleRecordForReport {
  return {
    id: BigInt(dateKey.slice(-2)),
    regDate: kstDate(dateKey),
    hasBowel: true,
    stoolBristol: 4,
    stoolSimple: 'M',
    bowelFeeling: null,
    stomach: null,
    distension: null,
    remainingFeeling: null,
    urgency: null,
    takenTime: null,
    amount: null,
    ...overrides,
  };
}

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
    jest.clearAllMocks();
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

  describe('createPdfReport', () => {
    let renderMonthlyPdfSpy: jest.SpiedFunction<
      typeof monthlyPdfRenderer.renderMonthlyPdf
    >;

    const pdfBuffer = Buffer.from('%PDF-test', 'ascii');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-15T03:00:00.000Z'));

      prismaMock.boogleRecord.findMany.mockResolvedValue([]);
      prismaMock.lifeRecord.findMany.mockResolvedValue([]);
      renderMonthlyPdfSpy = jest
        .spyOn(monthlyPdfRenderer, 'renderMonthlyPdf')
        .mockResolvedValue(pdfBuffer);
    });

    afterEach(() => {
      renderMonthlyPdfSpy.mockRestore();
      jest.useRealTimers();
    });

    it('현재 월은 KST 오늘까지 조회하고 PDF 데이터와 파일명을 반환한다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );

      const result = await service.createPdfReport(1n, {
        monthStartDate: '2026-07-01',
      });

      expect(prismaMock.boogleRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 1n,
            status: 'A',
            regDate: {
              gte: new Date('2026-06-30T15:00:00.000Z'),
              lt: new Date('2026-07-15T15:00:00.000Z'),
            },
          },
        }),
      );
      expect(prismaMock.lifeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 1n,
            status: 'A',
            regDate: {
              gte: new Date('2026-06-30T15:00:00.000Z'),
              lt: new Date('2026-07-15T15:00:00.000Z'),
            },
          },
        }),
      );
      expect(renderMonthlyPdfSpy).toHaveBeenCalledTimes(1);

      const pdfData = renderMonthlyPdfSpy.mock.calls[0][0];
      expect(pdfData.period).toEqual(
        expect.objectContaining({
          startDate: '2026-07-01',
          endDate: '2026-07-15',
          generatedDate: '2026-07-15',
          displayRange: '2026.07.01 - 2026.07.15 (15일)',
        }),
      );
      expect(pdfData.summary).toEqual(
        expect.objectContaining({
          bowelCount: 7,
          intervalAvg: 4.3,
          completionScore: 23.3,
        }),
      );
      expect(pdfData.dailyRows).toHaveLength(15);
      expect(result).toEqual({
        buffer: pdfBuffer,
        filename: 'boogle_report_202607.pdf',
      });
    });

    it('7일 미만 기록이면 REPORT_DATA_NOT_FOUND를 반환하고 렌더링하지 않는다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 6 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );

      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_DATA_NOT_FOUND,
      });
      expect(renderMonthlyPdfSpy).not.toHaveBeenCalled();
    });

    it('미래 월이면 REPORT_INVALID_DATE_RANGE를 반환하고 DB를 조회하지 않는다', async () => {
      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-08-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_INVALID_DATE_RANGE,
      });
      expect(prismaMock.boogleRecord.findMany).not.toHaveBeenCalled();
      expect(prismaMock.lifeRecord.findMany).not.toHaveBeenCalled();
      expect(renderMonthlyPdfSpy).not.toHaveBeenCalled();
    });

    it('월 시작일이 아니면 REPORT_INVALID_MONTH_FORMAT을 반환한다', async () => {
      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-02',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_INVALID_MONTH_FORMAT,
      });
    });

    it('renderer 오류를 REPORT_PDF_GENERATION_FAILED로 변환한다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );
      renderMonthlyPdfSpy.mockRejectedValueOnce(new Error('render failed'));

      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_PDF_GENERATION_FAILED,
      });
    });
  });
});
