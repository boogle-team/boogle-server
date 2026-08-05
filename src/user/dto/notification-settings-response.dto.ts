// 알림 설정 값. 'Y'=켜짐, 'N'=꺼짐. (member.record_alarm 등 Char(1)과 동일)
export type AlarmFlag = 'Y' | 'N';

export interface NotificationSettingsResponseDto {
  // 기록 리마인더 알림
  recordAlarm: AlarmFlag;
  // 리포트 도착 알림
  reportAlarm: AlarmFlag;
  // 위험 신호 알림
  warnAlarm: AlarmFlag;
}
