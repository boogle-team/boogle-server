import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { PushSenderService } from '@/push/push-sender.service';
import { NotificationCreationService } from './notification-creation.service';
import {
  NOTIFICATION_TEMPLATES,
  renderTemplate,
} from './notification-templates';
import { NOTIFICATION_LINK_TO } from './dto/notification-response.dto';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 연속 기록 계산 시 거슬러 올라가는 최대 일수. 이보다 긴 연속 기록은 이 값으로
// 잘려 표시된다(초기 단계에선 충분한 상한).
const STREAK_LOOKBACK_DAYS = 60;

// KST 달력 날짜 유틸. (홈/캘린더와 규칙 동일 — 절대 시각을 KST 날짜 키로 환산)
function toDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
function kstDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+09:00`);
}
function addDaysKey(dateStr: string, amount: number): string {
  const date = kstDayStart(dateStr);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}
function getTodayKstDateString(): string {
  return toDateKey(new Date());
}

// 오늘(또는 가장 최근 기록일)부터 거꾸로 연속으로 기록이 있는 일수.
// 오늘 기록이 아직 없으면 어제부터 센다(홈 streak과 동일 규칙).
export function calculateStreak(
  todayKey: string,
  recordedDateKeys: Set<string>,
): number {
  let cursor = todayKey;
  if (!recordedDateKeys.has(cursor)) {
    cursor = addDaysKey(cursor, -1);
  }
  let streak = 0;
  while (recordedDateKeys.has(cursor)) {
    streak++;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

/**
 * 리마인더·연속기록 독려를 매일 배치로 발송한다.
 * 대상 유저에게 in-app 알림 생성(NotificationCreationService)과
 * 푸시 발송(PushSenderService)을 함께 호출한다.
 *
 * @Cron은 시각만 지정하고 실제 로직은 run* 메서드로 분리해 유닛테스트한다.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creation: NotificationCreationService,
    private readonly pushSender: PushSenderService,
  ) {}

  @Cron('0 18 * * *', {
    name: 'record-reminder',
    timeZone: 'Asia/Seoul',
  })
  handleRecordReminderCron(): Promise<void> {
    return this.runRecordReminders(getTodayKstDateString());
  }

  @Cron('0 9 * * *', {
    name: 'streak-encouragement',
    timeZone: 'Asia/Seoul',
  })
  handleStreakCron(): Promise<void> {
    return this.runStreakEncouragement(getTodayKstDateString());
  }

  // 오늘 부글 기록이 없는(=기록 알림 켠 활성) 유저에게 리마인더 발송.
  async runRecordReminders(today: string): Promise<void> {
    const members = await this.findAlarmEnabledMembers();
    if (members.length === 0) return;

    const memberIds = members.map((member) => member.id);
    const todaysRecorderIds = await this.findTodayRecorderIds(today, memberIds);
    const template = NOTIFICATION_TEMPLATES.RECORD_REMINDER;

    let sent = 0;
    for (const member of members) {
      const userId = member.id.toString();
      if (todaysRecorderIds.has(userId)) continue; // 이미 오늘 기록함 → 스킵

      // 한 유저 실패가 배치 전체를 멈추지 않도록 유저별로 격리한다.
      try {
        const created = await this.creation.create({
          userId,
          type: 'RECORD_REMINDER',
        });
        await this.pushSender.send(userId, {
          notificationId: created.id,
          title: template.title,
          body: template.content,
          type: 'RECORD_REMINDER',
          linkTo: NOTIFICATION_LINK_TO[template.category],
        });
        sent += 1;
      } catch (error) {
        this.logger.error(
          `기록 리마인더 실패 userId=${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    this.logger.log(`기록 리마인더 발송 ${sent}명`);
  }

  // 연속 기록 중(어제까지 streak ≥ 1)인 유저에게 독려 발송(며칠째인지 params로 치환).
  async runStreakEncouragement(today: string): Promise<void> {
    const members = await this.findAlarmEnabledMembers();
    if (members.length === 0) return;

    const memberIds = members.map((member) => member.id);
    const datesByUser = await this.loadRecordDatesByUser(today, memberIds);
    const template = NOTIFICATION_TEMPLATES.STREAK;
    // 아침 배치이므로 "어제까지"의 연속 기록을 기준으로 한다(오늘 기록은 제외).
    const referenceDay = addDaysKey(today, -1);

    let sent = 0;
    for (const member of members) {
      const userId = member.id.toString();
      const dates = datesByUser.get(userId);
      if (!dates) continue;

      const streak = calculateStreak(referenceDay, dates);
      if (streak < 1) continue;

      const params = { days: streak };
      try {
        const created = await this.creation.create({
          userId,
          type: 'STREAK',
          params,
        });
        await this.pushSender.send(userId, {
          notificationId: created.id,
          title: renderTemplate(template.title, params),
          body: renderTemplate(template.content, params),
          type: 'STREAK',
          linkTo: NOTIFICATION_LINK_TO[template.category],
        });
        sent += 1;
      } catch (error) {
        this.logger.error(
          `연속기록 독려 실패 userId=${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    this.logger.log(`연속기록 독려 발송 ${sent}명`);
  }

  // 기록 알림(record_alarm)이 꺼지지 않은(= 'N'이 아닌, null=기본 Y 포함) 활성 회원.
  private findAlarmEnabledMembers() {
    return this.prisma.member.findMany({
      where: {
        status: 'A',
        OR: [{ recordAlarm: { not: 'N' } }, { recordAlarm: null }],
      },
      select: { id: true },
    });
  }

  private async findTodayRecorderIds(
    today: string,
    memberIds: bigint[],
  ): Promise<Set<string>> {
    const records = await this.prisma.boogleRecord.findMany({
      where: {
        status: 'A',
        userId: { in: memberIds },
        regDate: {
          gte: kstDayStart(today),
          lt: kstDayStart(addDaysKey(today, 1)),
        },
      },
      select: { userId: true },
    });
    return new Set(records.map((record) => record.userId.toString()));
  }

  private async loadRecordDatesByUser(
    today: string,
    memberIds: bigint[],
  ): Promise<Map<string, Set<string>>> {
    const records = await this.prisma.boogleRecord.findMany({
      where: {
        status: 'A',
        userId: { in: memberIds },
        // "어제까지"만 필요하므로 오늘은 범위에서 제외(lt 오늘 자정).
        regDate: {
          gte: kstDayStart(addDaysKey(today, -STREAK_LOOKBACK_DAYS)),
          lt: kstDayStart(today),
        },
      },
      select: { userId: true, regDate: true },
    });

    const datesByUser = new Map<string, Set<string>>();
    for (const record of records) {
      const userId = record.userId.toString();
      const dates = datesByUser.get(userId) ?? new Set<string>();
      dates.add(toDateKey(record.regDate));
      datesByUser.set(userId, dates);
    }
    return datesByUser;
  }
}
