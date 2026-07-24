import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('RecordService', () => {
  let service: RecordService;

  const mockCreate = jest.fn();
  const mockPrismaService = {
    boogleRecord: {
      create: mockCreate,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
