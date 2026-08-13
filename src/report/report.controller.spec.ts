import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
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

  function getResponseMessage(
    prototype: object,
    methodName: string,
  ): string | undefined {
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

  it('PDF Buffer와 다운로드 헤더를 그대로 응답한다', async () => {
    const buffer = Buffer.from('%PDF-test', 'ascii');
    reportServiceMock.createPdfReport.mockResolvedValue({
      buffer,
      filename: 'boogle_report_202607.pdf',
    });

    const responseMock = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.createPdfReport(
      { monthStartDate: '2026-07-01' },
      { id: '1' } satisfies AuthenticatedUser,
      responseMock as unknown as Response,
    );

    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="boogle_report_202607.pdf"',
    );
    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Length',
      buffer.length.toString(),
    );
    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Access-Control-Expose-Headers',
      'Content-Disposition',
    );
    expect(reportServiceMock.createPdfReport).toHaveBeenCalledWith(1n, {
      monthStartDate: '2026-07-01',
    });
    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(responseMock.send).toHaveBeenCalledWith(buffer);
  });
});
