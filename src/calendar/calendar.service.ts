import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BoogleStatus,
  CalendarDayDto,
  CalendarResponseDto,
} from './dto/calendar-response.dto';
import {
  BoogleRecordDetailDto,
  CalendarDailyResponseDto,
  LifeRecordDetailDto,
} from './dto/calendar-daily-response.dto';

function parseAutoTags(autoTags: string | null): string[] {
  if (!autoTags) return [];
  return autoTags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyCalendar(
    userId: bigint,
    year: number,
    month: number,
  ): Promise<CalendarResponseDto> {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const [boogleRecords, lifeRecords] = await Promise.all([
      this.prisma.boogleRecord.findMany({
        where: {
          userId,
          status: 'A',
          regDate: { gte: monthStart, lt: monthEnd },
        },
        select: {
          regDate: true,
          hasBowel: true,
          stoolSimple: true,
        },
        orderBy: { regDate: 'asc' },
      }),
      this.prisma.lifeRecord.findMany({
        where: {
          userId,
          status: 'A',
          regDate: { gte: monthStart, lt: monthEnd },
        },
        select: { regDate: true },
      }),
    ]);

    // 하루 여러 건일 때 대표값: has_bowel=true 기록이 하나라도 있으면 BOWEL,
    // 그 stoolSimple은 가장 마지막(최신) BOWEL 기록 기준.
    // (§9 팀 확정 전 잠정 규칙)
    const boogleByDate = new Map<
      string,
      { boogleStatus: BoogleStatus; stoolSimple: string | null }
    >();
    for (const record of boogleRecords) {
      const key = toDateKey(record.regDate);
      const existing = boogleByDate.get(key);
      if (record.hasBowel) {
        boogleByDate.set(key, {
          boogleStatus: 'BOWEL',
          stoolSimple: record.stoolSimple,
        });
      } else if (!existing || existing.boogleStatus !== 'BOWEL') {
        boogleByDate.set(key, { boogleStatus: 'NO_BOWEL', stoolSimple: null });
      }
    }

    const lifeRecordDates = new Set(
      lifeRecords.map((record) => toDateKey(record.regDate)),
    );

    const days: CalendarDayDto[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const key = toDateKey(date);
      const boogle = boogleByDate.get(key);

      days.push({
        date: key,
        boogleStatus: boogle?.boogleStatus ?? 'NONE',
        hasLifeRecord: lifeRecordDates.has(key),
        stoolSimple: boogle?.stoolSimple ?? null,
      });
    }

    const noBowelDays = days.filter(
      (d) => d.boogleStatus === 'NO_BOWEL',
    ).length;
    const bowelDays = days.filter((d) => d.boogleStatus === 'BOWEL');
    const recordedDays = bowelDays.length + noBowelDays;
    const unrecordedDays = daysInMonth - recordedDays;

    const hardCount = bowelDays.filter((d) => d.stoolSimple === 'H').length;
    const normalCount = bowelDays.filter((d) => d.stoolSimple === 'M').length;
    const looseCount = bowelDays.filter((d) => d.stoolSimple === 'T').length;
    const bowelTotal = bowelDays.length || 1;
    const percent = (count: number) => Math.round((count / bowelTotal) * 100);

    return {
      year,
      month,
      days,
      summary: {
        recordedDays,
        noBowelDays,
        unrecordedDays,
        stoolDistribution: {
          hard: { count: hardCount, percent: percent(hardCount) },
          normal: { count: normalCount, percent: percent(normalCount) },
          loose: { count: looseCount, percent: percent(looseCount) },
        },
      },
    };
  }

  async getDailyRecords(
    userId: bigint,
    date: string,
  ): Promise<CalendarDailyResponseDto> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [boogleRecords, lifeRecord] = await Promise.all([
      this.prisma.boogleRecord.findMany({
        where: {
          userId,
          status: 'A',
          regDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { regDate: 'asc' },
        include: {
          boogleTags: { include: { tag: true } },
        },
      }),
      this.prisma.lifeRecord.findFirst({
        where: {
          userId,
          status: 'A',
          regDate: { gte: dayStart, lte: dayEnd },
        },
        include: {
          lifeTags: { include: { tag: true } },
          foodTags: { include: { food: true } },
          medicineMaps: { include: { medicine: true } },
        },
      }),
    ]);

    const boogleRecordDtos: BoogleRecordDetailDto[] = boogleRecords.map(
      (record) => ({
        id: Number(record.id),
        regDate: record.regDate,
        hasBowel: record.hasBowel,
        stoolBristol: record.stoolBristol,
        stoolSimple: record.stoolSimple,
        bowelFeeling: record.bowelFeeling,
        stomach: record.stomach,
        distension: record.distension,
        remainingFeeling: record.remainingFeeling,
        urgency: record.urgency,
        takenTime: record.takenTime,
        amount: record.amount,
        color: record.color,
        memo: record.memo,
        autoTags: parseAutoTags(record.autoTags),
        tags: record.boogleTags.map((bt) => ({
          id: Number(bt.tag.id),
          name: bt.tag.name,
        })),
        updatedAt: record.updateDate,
      }),
    );

    const lifeRecordDto: LifeRecordDetailDto | null = lifeRecord
      ? {
          id: Number(lifeRecord.id),
          regDate: lifeRecord.regDate,
          sleep: lifeRecord.sleep,
          stress: lifeRecord.stress,
          water: lifeRecord.water,
          mealRegular: lifeRecord.mealRegular,
          sleepTime: lifeRecord.sleepTime,
          exercise: lifeRecord.exercise,
          caffeine: lifeRecord.caffeine,
          outing: lifeRecord.outing,
          hormone: lifeRecord.hormone,
          memo: lifeRecord.memo,
          autoTags: parseAutoTags(lifeRecord.autoTags),
          tags: lifeRecord.lifeTags.map((lt) => ({
            id: Number(lt.tag.id),
            name: lt.tag.name,
          })),
          foods: lifeRecord.foodTags.map((ft) => ({
            id: ft.food.id,
            name: ft.food.name,
          })),
          medicines: lifeRecord.medicineMaps.map((mm) => ({
            id: mm.medicine.id,
            name: mm.medicine.name ?? '',
          })),
          updatedAt: lifeRecord.updateTime,
        }
      : null;

    return {
      date,
      boogleRecords: boogleRecordDtos,
      lifeRecord: lifeRecordDto,
    };
  }
}
