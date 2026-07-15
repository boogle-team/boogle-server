export type NotificationCategory = 'W' | 'R' | 'P';

export type NotificationLinkTo = 'GUIDE_WARNING' | 'HOME' | 'REPORT';

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
