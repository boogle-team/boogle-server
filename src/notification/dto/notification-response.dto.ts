export type NotificationCategory = 'W' | 'R' | 'P';

export type NotificationLinkTo = 'GUIDE_WARNING' | 'HOME' | 'REPORT';

// 알림 유형별 의미 코드. 프론트가 이 값으로 아이콘을 매핑한다(백엔드는 아이콘
// 파일명을 알 필요가 없음 — linkTo와 동일하게 의미 코드만 내려준다).
// category(W/R/P, 점 색)로는 5종을 구분할 수 없어 별도 필드로 둔다.
export type NotificationType =
  | 'WARNING' // N101 위험 신호
  | 'RECORD_REMINDER' // N102 기록 리마인더
  | 'REPORT_READY' // N103 리포트 도착
  | 'PDF_SAVED' // N104 PDF 저장 완료
  | 'STREAK'; // N105 연속 기록 독려

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

export interface NotificationListResponseDto {
  unreadCount: number;
  notifications: NotificationItemDto[];
}
