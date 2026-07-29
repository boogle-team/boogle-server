export enum NotificationErrorCode {
  // 존재하지 않거나 로그인 사용자의 알림이 아닌 경우(소유 검증 실패 포함).
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  // 알림 생성 시 유형별 필수 템플릿 파라미터가 누락된 경우(호출부 계약 위반).
  NOTIFICATION_INVALID_PARAMS = 'NOTIFICATION_INVALID_PARAMS',
}
