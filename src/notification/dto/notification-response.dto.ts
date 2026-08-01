export type NotificationCategory = 'W' | 'R' | 'P';

export type NotificationLinkTo = 'GUIDE_WARNING' | 'HOME' | 'REPORT';

// 알림 유형별 의미 코드. 프론트가 이 값으로 아이콘을 매핑한다(백엔드는 아이콘
// 파일명을 알 필요가 없음 — linkTo와 동일하게 의미 코드만 내려준다).
// category(W/R/P, 점 색)로는 5종을 구분할 수 없어 별도 필드로 둔다.
export const NOTIFICATION_TYPES = [
  'WARNING', // N101 위험 신호
  'RECORD_REMINDER', // N102 기록 리마인더
  'REPORT_READY', // N103 리포트 도착
  'PDF_SAVED', // N104 PDF 저장 완료
  'STREAK', // N105 연속 기록 독려
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// alarm.type은 DB상 자유 문자열(VARCHAR)이라, 계약(5종) 밖의 값이 저장돼 있을
// 수 있다. 그대로 단언(as)하면 무효값이 응답으로 새어나가 프론트 아이콘 매핑을
// 조용히 깨뜨리므로, 알려진 값만 통과시키고 그 외에는 null로 폴백한다.
export function toNotificationType(
  value: string | null | undefined,
): NotificationType | null {
  return NOTIFICATION_TYPES.includes(value as NotificationType)
    ? (value as NotificationType)
    : null;
}

// alarm.category ↔ 화면 이동 대상은 1:1로 대응된다 (DB에 별도 컬럼 없음).
// W(위험) → 가이드 탭 주의 신호 카드, R(기록) → 홈, P(리포트) → 리포트 화면.
export const NOTIFICATION_LINK_TO: Record<
  NotificationCategory,
  NotificationLinkTo
> = {
  W: 'GUIDE_WARNING',
  R: 'HOME',
  P: 'REPORT',
};

export interface NotificationItemDto {
  id: number;
  category: NotificationCategory;
  // 아이콘 매핑용 의미 코드. 알람 원본에 값이 없으면(구 데이터 등) null →
  // 프론트는 기본 아이콘으로 폴백한다.
  type: NotificationType | null;
  title: string;
  content: string;
  linkTo: NotificationLinkTo;
  regDate: Date;
  isRead: boolean;
}

export interface NotificationReadResponseDto {
  id: number;
  isRead: boolean;
  // 읽음 처리 후 다시 센 안읽음 개수(🔔 뱃지 즉시 갱신용).
  unreadCount: number;
}

export interface NotificationListResponseDto {
  unreadCount: number;
  notifications: NotificationItemDto[];
}
