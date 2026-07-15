import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

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
});
