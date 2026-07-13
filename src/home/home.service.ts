import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { HomeErrorCode } from './home-error-code.enum';
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
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// streak(연속 기록 일수) 조회 상한. 이 값보다 긴 연속 기록은 401(선택일 포함)로
// 잘려서 표시된다. 초기 단계에서 400일(약 13개월) 연속 기록 사용자가 나올
// 가능성은 낮다고 보고, 무제한 역방향 페이지 조회 대신 의도적으로 상한을 둔
// 제품 계약으로 취급한다. 필요해지면 이 상수를 늘리거나 페이지 조회로 교체한다.
const STREAK_LOOKBACK_DAYS = 400;

// regDate는 절대 시각(UTC instant)으로 저장되어 있다는 전제 하에,
// "며칠"인지 판단할 때는 Asia/Seoul(KST) 기준 달력 날짜로 변환해야 한다.
// UTC 자정 기준으로 자르면 새벽 0~9시 KST 기록이 전날로 분류되는 버그가 생긴다.
function toDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// "YYYY-MM-DD"(KST 달력 날짜)의 자정에 해당하는 실제 UTC 시각.
function dayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+09:00`);
}

function addDays(dateStr: string, amount: number): string {
  const date = dayStart(dateStr);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

// 반개방 구간(다음 날 자정 미만)의 상한 시각. `23:59:59.999`처럼 고정
// 소수초로 자르면 그보다 더 정밀한 소수초에 저장된 기록이 누락될 수 있어
// "다음 날 시작 직전까지"를 `lt`로 비교하는 방식을 쓴다.
function nextDayStart(dateStr: string): Date {
  return dayStart(addDays(dateStr, 1));
}

// 요일은 달력 날짜 자체의 속성이라 실제 시각 변환 없이 순수 계산으로 구한다.
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 ~ 6=토
}

function getTodayKstDateString(): string {
  const now = new Date();
  return toDateKey(now);
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
      throw new BusinessException(
        HomeErrorCode.MEMBER_NOT_FOUND,
        '요청한 데이터를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    // 오늘/이번 주/연속기록(streak)이 필요로 하는 날짜 범위가 서로 겹치므로
    // (오늘 ⊂ 이번 주 ⊂ 최근 400일), boogle_record는 한 번만 넓게 조회하고
    // 나머지는 메모리에서 derive한다. 미래 날짜(이번 주 남은 요일 등)는
    // 애초에 기록이 있을 수 없으므로 조회 범위에서 빠져도 결과에 영향 없다.
    const lookbackStart = addDays(date, -STREAK_LOOKBACK_DAYS);

    const [monthlyRecord, allBoogleRecords, lifeRecord] = await Promise.all([
      this.prisma.monthlyRecord.findFirst({
        where: { userId },
        orderBy: { monthStartDate: 'desc' },
        select: { userType: true },
      }),
      this.prisma.boogleRecord.findMany({
        where: {
          userId,
          status: 'A',
          regDate: { gte: dayStart(lookbackStart), lt: nextDayStart(date) },
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
          regDate: { gte: dayStart(date), lt: nextDayStart(date) },
        },
        include: {
          foodTags: { include: { food: true } },
        },
      }),
    ]);

    const recordedDates = new Set(
      allBoogleRecords.map((record) => toDateKey(record.regDate)),
    );
    const boogleRecords = allBoogleRecords.filter(
      (record) => toDateKey(record.regDate) === date,
    );

    const weekStrip = this.buildWeekStrip(date, recordedDates);
    const streak = this.calculateStreak(date, recordedDates);

    const joinedDays = Math.max(
      1,
      Math.floor(
        (dayStart(date).getTime() -
          dayStart(toDateKey(member.regDate)).getTime()) /
          ONE_DAY_MS,
      ) + 1,
    );

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

  private buildWeekStrip(
    date: string,
    recordedDates: Set<string>,
  ): WeekStripDayDto[] {
    const dayOfWeek = getDayOfWeek(date);
    const weekStartDate = addDays(date, -dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStartDate, i);
      return { date: day, hasRecord: recordedDates.has(day) };
    });
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
