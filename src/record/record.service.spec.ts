import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRecordDto } from './dto/boogle-record.dto';

describe('RecordService', () => {
  let service: RecordService;

  const mockCreate = jest.fn();
  const mockPrismaService = {
    boogleRecord: {
      create: mockCreate,
    },
  };

  beforeEach(async () => {
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
  it('create()가 데이터를 가공하여 성공적으로 반환한다', async () => {
    const dto: Partial<CreateRecordDto> = {
      regDate: '2026-07-11',
      hasBowel: true,
    };

    const mockDbRecord = {
      id: 1,
      userId: 1,
      regDate: new Date('2026-07-11'),
      hasBowel: true,
      stoolBristol: 4,
      stoolSimple: 'good',
      bowelFeeling: 'good',
      stomach: 'good',
      distension: false,
      remainingFeeling: false,
      urgency: false,
      takenTime: 5,
      amount: 1,
      color: 'brown',
      status: 'NORMAL',
      updateDate: new Date('2026-07-11'),
    };

    mockCreate.mockResolvedValue(mockDbRecord);

    const result = await service.create(1, dto as CreateRecordDto);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 1,
        hasBowel: false,
        regDate: new Date('2026-07-11'),
      },
    });

    expect(result.regDate).toBe('2026-07-11');
    expect(result.id).toBe(1);
  });
});
