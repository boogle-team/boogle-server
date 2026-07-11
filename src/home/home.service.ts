import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HomeResponseDto, WeekStripDayDto } from './dto/home-response.dto';

const USER_TYPE_LABEL: Record<string, string> = {
  R: '규칙형',
  C: '변비경향형',
  L: '묽은변경향형',
  I: '생활영향형',
  U: '불규칙형',
  N: '기록부족형',
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
// 하루 경계(자정)를 무엇으로 볼지는 팀 확정 전이라 UTC 기준으로 단순화한다.
// (docs/api/home-calendar-api.md §9 참고)
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function dayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

function addDays(dateStr: string, amount: number): string {
  const date = dayStart(dateStr);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function getTodayKstDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(userId: bigint, dateParam?: string): Promise<HomeResponseDto> {
    const date = dateParam ?? getTodayKstDateString();

    const member = await this.prisma.member.findUnique({
      where: { id: userId },
      select: { nickname: true, regDate: true },
    });
    if (!member) {
      throw new NotFoundException('요청한 데이터를 찾을 수 없습니다.');
    }

    const [
      monthlyRecord,
      boogleRecords,
      lifeRecord,
      weekBoogleDates,
      streakBoogleDates,
    ] = await Promise.all([
      this.prisma.monthlyRecord.findFirst({
        where: { userId },
        orderBy: { monthStartDate: 'desc' },
        select: { userType: true },
      }),
      this.prisma.boogleRecord.findMany({
        where: {
          userId,
          status: 'A',
          regDate: { gte: dayStart(date), lte: dayEnd(date) },
        },
        orderBy: { regDate: 'asc' },
        select: {
          id: true,
          regDate: true,
          hasBowel: true,
          stoolBristol: true,
          stoolSimple: true,
          bowelFeeling: true,
          stomach: true,
        },
      }),
      this.prisma.lifeRecord.findFirst({
        where: {
          userId,
          status: 'A',
          regDate: { gte: dayStart(date), lte: dayEnd(date) },
        },
        include: {
          foodTags: { include: { food: true } },
        },
      }),
      this.getWeekBoogleDates(userId, date),
      this.getStreakLookbackDates(userId, date),
    ]);

    const weekStrip = this.buildWeekStrip(date, weekBoogleDates);
    const streak = this.calculateStreak(date, streakBoogleDates);

    const joinedDays =
      Math.floor(
        (dayStart(date).getTime() -
          dayStart(toDateKey(member.regDate)).getTime()) /
          ONE_DAY_MS,
      ) + 1;

    return {
      user: {
        id: Number(userId),
        nickname: member.nickname ?? '',
        userType: monthlyRecord?.userType ?? null,
        userTypeLabel: monthlyRecord?.userType
          ? (USER_TYPE_LABEL[monthlyRecord.userType] ?? null)
          : null,
        joinedDays,
      },
      today: {
        date,
        greeting:
          boogleRecords.length > 0
            ? '오늘 부글 신호를 보냈어요!'
            : '오늘의 첫 기록을 남겨보세요',
      },
      streak,
      weekStrip,
      boogleCount: boogleRecords.length,
      boogleRecords: boogleRecords.map((record) => ({
        id: Number(record.id),
        regDate: record.regDate,
        hasBowel: record.hasBowel,
        stoolBristol: record.stoolBristol,
        stoolSimple: record.stoolSimple,
        bowelFeeling: record.bowelFeeling,
        stomach: record.stomach,
      })),
      lifeRecord: lifeRecord
        ? {
            id: Number(lifeRecord.id),
            regDate: lifeRecord.regDate,
            sleep: lifeRecord.sleep,
            stress: lifeRecord.stress,
            water: lifeRecord.water,
            mealRegular: lifeRecord.mealRegular,
            foods: lifeRecord.foodTags.map((ft) => ({
              id: ft.food.id,
              name: ft.food.name,
            })),
          }
        : null,
      // 리포트/가이드 도메인의 주간 패턴 산출 데이터에 의존.
      // 소스가 정해지기 전까지는 항상 null(카드 숨김)로 반환한다.
      weeklyPattern: null,
    };
  }

  private async getWeekBoogleDates(
    userId: bigint,
    date: string,
  ): Promise<Set<string>> {
    const dayOfWeek = dayStart(date).getUTCDay(); // 0=일 ~ 6=토
    const weekStartDate = addDays(date, -dayOfWeek);
    const weekEndDate = addDays(date, 6 - dayOfWeek);

    const records = await this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: { gte: dayStart(weekStartDate), lte: dayEnd(weekEndDate) },
      },
      select: { regDate: true },
    });

    return new Set(records.map((r) => toDateKey(r.regDate)));
  }

  private buildWeekStrip(
    date: string,
    weekBoogleDates: Set<string>,
  ): WeekStripDayDto[] {
    const dayOfWeek = dayStart(date).getUTCDay();
    const weekStartDate = addDays(date, -dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStartDate, i);
      return { date: day, hasRecord: weekBoogleDates.has(day) };
    });
  }

  private async getStreakLookbackDates(
    userId: bigint,
    date: string,
  ): Promise<Set<string>> {
    const lookbackStart = addDays(date, -400);

    const records = await this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: { gte: dayStart(lookbackStart), lte: dayEnd(date) },
      },
      select: { regDate: true },
    });

    return new Set(records.map((r) => toDateKey(r.regDate)));
  }

  private calculateStreak(date: string, recordedDates: Set<string>): number {
    let cursor = date;
    if (!recordedDates.has(cursor)) {
      cursor = addDays(cursor, -1);
    }

    let streak = 0;
    while (recordedDates.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }
}
