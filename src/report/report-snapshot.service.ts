import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { MonthlyUserTypeCode } from './dto/monthly-report-response.dto';
import { addKstDateKeyDays } from '@/common/utils/kst-date.util';

export interface WeeklySnapshotValue {
  bowelCount: number;
  intervalAvg: number;
  completionScore: number;
  recordedDays: number;
}

export interface MonthlySnapshotValue {
  bowelCount: number;
  bowelDays: number;
  intervalAvg: number;
  state: number;
  completionScore: number;
  rhythmScore: number;
  stateScore: number;
  conditionScore: number;
  userType: MonthlyUserTypeCode;
  recordedDays: number;
}

function parseCalendarDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function getMondayDateKey(dateKey: string): string {
  const date = parseCalendarDate(dateKey);
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  return addKstDateKeyDays(dateKey, -daysFromMonday);
}

function getMonthStartDateKey(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

@Injectable()
export class ReportSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async findFinalizedWeekly(
    userId: bigint,
    weekStartDate: Date,
  ): Promise<WeeklySnapshotValue | null> {
    const row = await this.prisma.weeklyRecord.findUnique({
      where: {
        userId_weekStartDate: { userId, weekStartDate },
      },
    });

    if (row === null || !row.isFinalized) {
      return null;
    }

    const expectedEndDate = addCalendarDays(weekStartDate, 6);

    if (!isSameCalendarDate(row.calculatedThroughDate, expectedEndDate)) {
      return null;
    }

    return {
      bowelCount: row.bowelCount,
      intervalAvg: row.intervalAvg,
      completionScore: row.completionScore,
      recordedDays: row.recordedDays,
    };
  }

  async upsertWeekly(
    userId: bigint,
    weekStartDate: Date,
    calculatedThroughDate: Date,
    isFinalized: boolean,
    value: WeeklySnapshotValue,
  ): Promise<void> {
    await this.prisma.weeklyRecord.upsert({
      where: {
        userId_weekStartDate: { userId, weekStartDate },
      },
      create: {
        userId,
        weekStartDate,
        calculatedThroughDate,
        isFinalized,
        ...value,
      },
      update: {
        calculatedThroughDate,
        isFinalized,
        ...value,
      },
    });
  }

  async findFinalizedMonthly(
    userId: bigint,
    monthStartDate: Date,
    monthEndDate: Date,
  ): Promise<MonthlySnapshotValue | null> {
    const row = await this.prisma.monthlyRecord.findUnique({
      where: {
        userId_monthStartDate: { userId, monthStartDate },
      },
    });

    if (
      row === null ||
      !row.isFinalized ||
      !isSameCalendarDate(row.calculatedThroughDate, monthEndDate)
    ) {
      return null;
    }

    return {
      bowelCount: row.bowelCount,
      bowelDays: row.bowelDays,
      intervalAvg: row.intervalAvg,
      state: row.state,
      completionScore: row.completionScore,
      rhythmScore: row.rhythmScore,
      stateScore: row.stateScore,
      conditionScore: row.conditionScore,
      userType: row.userType as MonthlyUserTypeCode,
      recordedDays: row.recordedDays,
    };
  }

  async upsertMonthly(
    userId: bigint,
    monthStartDate: Date,
    calculatedThroughDate: Date,
    isFinalized: boolean,
    value: MonthlySnapshotValue,
  ): Promise<void> {
    await this.prisma.monthlyRecord.upsert({
      where: {
        userId_monthStartDate: { userId, monthStartDate },
      },
      create: {
        userId,
        monthStartDate,
        calculatedThroughDate,
        isFinalized,
        ...value,
      },
      update: {
        calculatedThroughDate,
        isFinalized,
        ...value,
      },
    });
  }

  async invalidateByDateKey(userId: bigint, dateKey: string): Promise<void> {
    const weekStartDate = parseCalendarDate(getMondayDateKey(dateKey));
    const monthStartDate = parseCalendarDate(getMonthStartDateKey(dateKey));

    await this.prisma.$transaction([
      this.prisma.weeklyRecord.deleteMany({
        where: { userId, weekStartDate },
      }),
      this.prisma.monthlyRecord.deleteMany({
        where: { userId, monthStartDate },
      }),
    ]);
  }

  async invalidateByDateKeys(
    userId: bigint,
    dateKeys: readonly string[],
  ): Promise<void> {
    const uniqueDateKeys = [...new Set(dateKeys)];

    await Promise.all(
      uniqueDateKeys.map((dateKey) =>
        this.invalidateByDateKey(userId, dateKey),
      ),
    );
  }
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isSameCalendarDate(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}
