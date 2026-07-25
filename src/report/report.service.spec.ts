import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from './report.service';

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
});
