import {
  NotificationCategory,
  NotificationType,
} from './dto/notification-response.dto';

// 알림 유형별 문구 템플릿(코드 상수). 각 도메인은 이 템플릿을 직접 다루지 않고
// NotificationCreationService.create({ type, ... })로만 알림을 심는다.
//
// title/content의 `{키}`는 생성 시 params로 치환된다. params가 필요한 유형은
// 아래 requiredParams에 명시 — 누락 시 생성 단계에서 에러로 잡는다.
export interface NotificationTemplate {
  category: NotificationCategory;
  title: string;
  content: string;
  // 이 유형이 반드시 받아야 하는 파라미터 키. 없으면 [](고정 문구).
  requiredParams: string[];
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  // 위험 신호: 감지된 변 색상 등이 유저마다 달라 {color} 치환.
  WARNING: {
    category: 'W',
    title: '주의가 필요한 기록이 있어요',
    content:
      '오늘 기록에서 {color} 변이 감지됐어요. 가이드 탭에서 자세한 안내를 확인해보세요.',
    requiredParams: ['color'],
  },
  // 기록 리마인더: 고정 문구.
  RECORD_REMINDER: {
    category: 'R',
    title: '기록할 시간이에요',
    content: '30초면 충분해요. 지금 기록해볼까요?',
    requiredParams: [],
  },
  // 리포트 도착: 고정 문구.
  REPORT_READY: {
    category: 'P',
    title: '이번 주 리포트가 도착했어요',
    content: '이번 주 패턴을 확인해보세요',
    requiredParams: [],
  },
  // PDF 저장 완료: 고정 문구.
  PDF_SAVED: {
    category: 'P',
    title: '월간 리포트 PDF 저장이 완료됐어요',
    content: '다운로드함에서 확인할 수 있어요',
    requiredParams: [],
  },
  // 연속 기록 독려: 연속 일수가 유저마다 달라 {days} 치환.
  STREAK: {
    category: 'R',
    title: '{days}일째 기록 중이에요!',
    content: '꾸준한 기록이 패턴 분석의 기본이에요',
    requiredParams: ['days'],
  },
};

export type NotificationTemplateParams = Record<string, string | number>;

// 템플릿 문자열에 등장하는 `{키}` 자리표시자 목록을 추출한다.
// (템플릿의 placeholder가 requiredParams에 빠짐없이 선언됐는지 테스트로 검증)
export function extractPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
}

// 템플릿 문자열의 `{키}`를 params 값으로 치환한다.
// 필수 파라미터 검증은 NotificationCreationService에서 requiredParams 기준으로
// 선행(BusinessException)하므로, 여기까지 값이 없다면 템플릿 설정 오류
// (placeholder가 requiredParams에 누락)다. 이는 단위 테스트가 잡으며, 런타임에선
// 크래시 대신 원본 자리표시자를 그대로 남긴다.
export function renderTemplate(
  template: string,
  params?: NotificationTemplateParams,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params?.[key];
    return value === undefined || value === null ? match : String(value);
  });
}
