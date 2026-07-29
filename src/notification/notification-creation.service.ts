import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationType } from './dto/notification-response.dto';
import {
  NOTIFICATION_TEMPLATES,
  NotificationTemplateParams,
  renderTemplate,
} from './notification-templates';

export interface CreateNotificationInput {
  // 알림을 받을 회원 id (member.id).
  userId: string | number | bigint;
  type: NotificationType;
  // 템플릿의 {키} 치환용. 고정 문구 유형은 생략 가능.
  params?: NotificationTemplateParams;
}

export interface CreatedNotification {
  // 생성된 alarm_map.id (= 알림 목록 응답의 notification id).
  id: number;
}

/**
 * 알림 생성 공용 진입점. 각 도메인(부글 기록·리포트·배치 등)은 alarm/alarm_map
 * 스키마를 직접 다루지 말고 이 서비스의 create()만 호출한다.
 *
 * NotificationModule에서 export하므로, 사용하는 쪽 모듈이 NotificationModule을
 * import한 뒤 NotificationCreationService를 주입해 쓰면 된다.
 */
@Injectable()
export class NotificationCreationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<CreatedNotification> {
    const template = NOTIFICATION_TEMPLATES[input.type];

    // 치환된 최종 문구를 alarm 행에 저장한다(조회 API가 alarm.title/content를
    // 그대로 내려주므로 유저별 문구가 그대로 반영된다).
    const title = renderTemplate(template.title, input.params);
    const content = renderTemplate(template.content, input.params);

    // alarm 생성과 alarm_map 연결은 원자적으로 처리한다(중간 실패 시 고아 alarm 방지).
    const alarmMap = await this.prisma.$transaction(async (tx) => {
      const alarm = await tx.alarm.create({
        data: {
          category: template.category,
          type: input.type,
          title,
          content,
        },
      });

      return tx.alarmMap.create({
        data: {
          userId: BigInt(input.userId),
          alarmId: alarm.id,
          isRead: 'N',
        },
      });
    });

    return { id: Number(alarmMap.id) };
  }
}
