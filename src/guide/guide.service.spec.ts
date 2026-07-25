import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { GuideService } from './guide.service';
import { ReportService } from '@/report/report.service';

describe('GuideService', () => {
  let service: GuideService;

  const prismaMock = {
    guide: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    guideFeedback: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    boogleRecord: {
      findMany: jest.fn(),
    },
  };

  const reportServiceMock = {
    getWeeklyReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuideService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ReportService,
          useValue: reportServiceMock,
        },
      ],
    }).compile();

    service = module.get<GuideService>(GuideService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
