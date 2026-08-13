import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportSnapshotService } from '@/report/report-snapshot.service';
import type { BoogleRecord } from '@/generated/prisma/client';

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();

const mockPrismaService = {
  boogleRecord: {
    create: mockCreate,
    findFirst: mockFindFirst,
    update: mockUpdate,
  },
};

const mockReportSnapshotService = {
  invalidateByDateKey: jest.fn(),
  invalidateByDateKeys: jest.fn(),
};

const activeRecord: BoogleRecord = {
  id: 1n,
  userId: 1n,
  regDate: new Date('2026-08-03T15:00:00.000Z'),
  hasBowel: true,
  stoolBristol: 4,
  stoolSimple: 'M',
  bowelFeeling: 'N',
  stomach: 0,
  bowelMovementAt: new Date('2026-08-04T00:30:00.000Z'),
  distension: 'N',
  remainingFeeling: 'N',
  urgency: 'N',
  takenTime: 5,
  amount: 'N',
  color: 'B',
  status: 'A',
  updateDate: new Date('2026-08-04T01:00:00.000Z'),
};

describe('RecordService', () => {
  let service: RecordService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReportSnapshotService.invalidateByDateKey.mockResolvedValue(undefined);
    mockReportSnapshotService.invalidateByDateKeys.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ReportSnapshotService,
          useValue: mockReportSnapshotService,
        },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('기록 생성 시 해당 날짜의 스냅샷을 무효화한다', async () => {
    const createdRecord: BoogleRecord = {
      ...activeRecord,
      bowelMovementAt: null,
    };
    mockCreate.mockResolvedValue(createdRecord);

    await service.create(1, {
      regDate: '2026-08-04',
      hasBowel: false,
    });

    expect(mockReportSnapshotService.invalidateByDateKey).toHaveBeenCalledWith(
      1n,
      '2026-08-04',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('배변 시각 수정 시 해당 기록 날짜의 스냅샷을 무효화한다', async () => {
    const updatedRecord: BoogleRecord = {
      ...activeRecord,
      bowelMovementAt: new Date('2026-08-04T06:30:00.000Z'),
    };

    mockFindFirst.mockResolvedValue(activeRecord);
    mockUpdate.mockResolvedValue(updatedRecord);

    await service.update(1, 1, { bowelMovementAt: '15:30' });

    expect(mockReportSnapshotService.invalidateByDateKeys).toHaveBeenCalledWith(
      1n,
      ['2026-08-04', '2026-08-04'],
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        bowelMovementAt: new Date('2026-08-04T15:30:00+09:00'),
      },
    });
  });

  it('날짜 외 필드 수정 시 해당 날짜의 스냅샷을 무효화한다', async () => {
    const updatedRecord: BoogleRecord = {
      ...activeRecord,
      stoolBristol: 2,
      stoolSimple: 'H',
    };

    mockFindFirst.mockResolvedValue(activeRecord);
    mockUpdate.mockResolvedValue(updatedRecord);

    await service.update(1, 1, { stoolBristol: 2 });

    expect(mockReportSnapshotService.invalidateByDateKeys).toHaveBeenCalledWith(
      1n,
      ['2026-08-04', '2026-08-04'],
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        stoolBristol: 2,
        stoolSimple: 'H',
      },
    });
  });

  it('기록 삭제 시 해당 날짜의 스냅샷을 무효화하고 status를 D로 바꾼다', async () => {
    mockFindFirst.mockResolvedValue(activeRecord);
    mockUpdate.mockResolvedValue({ ...activeRecord, status: 'D' });

    await service.remove(1, 1);

    expect(mockReportSnapshotService.invalidateByDateKey).toHaveBeenCalledWith(
      1n,
      '2026-08-04',
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'D' },
    });
  });

  it('스냅샷 무효화 실패 시 기록을 수정하지 않는다', async () => {
    mockFindFirst.mockResolvedValue(activeRecord);
    mockReportSnapshotService.invalidateByDateKeys.mockRejectedValueOnce(
      new Error('snapshot invalidation failed'),
    );

    await expect(service.update(1, 1, { stoolBristol: 2 })).rejects.toThrow(
      'snapshot invalidation failed',
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('스냅샷 무효화 실패 시 기록을 생성하지 않는다', async () => {
    mockReportSnapshotService.invalidateByDateKey.mockRejectedValueOnce(
      new Error('snapshot invalidation failed'),
    );

    await expect(
      service.create(1, {
        regDate: '2026-08-04',
        hasBowel: false,
      }),
    ).rejects.toThrow('snapshot invalidation failed');

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
