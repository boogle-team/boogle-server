export enum NotificationErrorCode {
  // 존재하지 않거나 로그인 사용자의 알림이 아닌 경우(소유 검증 실패 포함).
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  // 알림 생성 시 유형별 필수 템플릿 파라미터가 누락된 경우(호출부 계약 위반).
  NOTIFICATION_INVALID_PARAMS = 'NOTIFICATION_INVALID_PARAMS',
  // 테스트 발송 API가 비활성(NOTIFICATION_TEST_ENABLED != 'true')인 환경에서 호출된 경우.
  NOTIFICATION_TEST_DISABLED = 'NOTIFICATION_TEST_DISABLED',
}
