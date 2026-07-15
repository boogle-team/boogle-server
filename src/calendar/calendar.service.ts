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

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// regDate는 절대 시각(UTC instant)으로 저장되어 있다는 전제 하에,
// "며칠"인지 판단할 때는 Asia/Seoul(KST) 기준 달력 날짜로 변환해야 한다.
// UTC 자정 기준으로 자르면 새벽 0~9시 KST 기록이 전날로 분류되는 버그가 생긴다.
function toDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// "YYYY-MM-DD"(KST 달력 날짜)의 자정에 해당하는 실제 UTC 시각.
function kstDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+09:00`);
}

function kstDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+09:00`);
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyCalendar(
    userId: string,
    year: number,
    month: number,
  ): Promise<CalendarResponseDto> {
    const memberId = BigInt(userId);
    const pad = (n: number) => String(n).padStart(2, '0');
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;

    // 달력 날짜(KST) 기준 이번 달의 시작/다음 달 시작 시각.
    const monthStart = kstDayStart(`${year}-${pad(month)}-01`);
    const monthEnd = kstDayStart(`${nextMonthYear}-${pad(nextMonth)}-01`);
    // 일수 계산은 달력 산수라 타임존과 무관하다.
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const [boogleRecords, lifeRecords] = await Promise.all([
      this.prisma.boogleRecord.findMany({
        where: {
          userId: memberId,
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
          userId: memberId,
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
      // 순수 달력 날짜 문자열 조합이라 타임존 변환이 필요 없다.
      const key = `${year}-${pad(month)}-${pad(day)}`;
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
    userId: string,
    date: string,
  ): Promise<CalendarDailyResponseDto> {
    const memberId = BigInt(userId);
    const dayStart = kstDayStart(date);
    const dayEnd = kstDayEnd(date);

    const [boogleRecords, lifeRecord] = await Promise.all([
      this.prisma.boogleRecord.findMany({
        where: {
          userId: memberId,
          status: 'A',
          regDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { regDate: 'asc' },
      }),
      this.prisma.lifeRecord.findFirst({
        where: {
          userId: memberId,
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
