import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PushSenderService } from '@/push/push-sender.service';
import { NotificationCreationService } from './notification-creation.service';
import {
  NOTIFICATION_LINK_TO,
  NotificationType,
} from './dto/notification-response.dto';
import {
  NOTIFICATION_TEMPLATES,
  NotificationTemplateParams,
  renderTemplate,
} from './notification-templates';

// 알림 유형별로 어떤 사용자 설정(member 컬럼)이 푸시 발송을 게이트하는지.
// 이벤트성 알림은 "인앱은 항상 생성, 푸시만 설정을 따른다"(설정 화면 문구와 동일).
const PUSH_SETTING_COLUMN: Record<
  NotificationType,
  'recordAlarm' | 'reportAlarm' | 'warnAlarm'
> = {
  WARNING: 'warnAlarm',
  REPORT_READY: 'reportAlarm',
  PDF_SAVED: 'reportAlarm',
  RECORD_REMINDER: 'recordAlarm',
  STREAK: 'recordAlarm',
};

/**
 * 이벤트성 알림(위험 신호·리포트·PDF)의 공용 진입점.
 *
 * 각 도메인은 이 서비스의 dispatch()만 호출하면 된다:
 *   1) 인앱 알림을 **항상** 생성한다(설정과 무관 — 알림 목록에는 남아야 하므로).
 *   2) 해당 유형의 설정이 'N'이 아닐 때만 푸시를 발송한다.
 *
 * 리마인더·연속기록(배치)은 대상 조회 단계에서 이미 recordAlarm으로 필터하므로
 * 이 서비스를 쓰지 않는다(대상에서 빠지면 인앱도 만들지 않는 것이 의도된 동작).
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creation: NotificationCreationService,
    private readonly pushSender: PushSenderService,
  ) {}

  async dispatch(
    userId: string | number | bigint,
    type: NotificationType,
    params?: NotificationTemplateParams,
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES[type];

    // 1) 인앱 알림은 설정과 무관하게 항상 생성한다.
    const created = await this.creation.create({ userId, type, params });

    // 2) 푸시는 사용자 설정을 따른다. 값이 없으면(null=레거시) 기본 'Y'로 본다.
    if (!(await this.isPushEnabled(userId, type))) {
      return;
    }

    // 푸시 실패가 인앱 알림 생성까지 되돌리지 않도록 여기서 격리한다.
    try {
      await this.pushSender.send(String(userId), {
        notificationId: created.id,
        title: renderTemplate(template.title, params),
        body: renderTemplate(template.content, params),
        type,
        linkTo: NOTIFICATION_LINK_TO[template.category],
      });
    } catch (error) {
      this.logger.error(
        `푸시 발송 실패 userId=${String(userId)} type=${type}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async isPushEnabled(
    userId: string | number | bigint,
    type: NotificationType,
  ): Promise<boolean> {
    const column = PUSH_SETTING_COLUMN[type];
    const member = await this.prisma.member.findUnique({
      where: { id: BigInt(userId) },
      select: { [column]: true },
    });

    return (member as Record<string, string | null> | null)?.[column] !== 'N';
  }
}
