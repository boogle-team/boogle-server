import { ApiProperty } from '@nestjs/swagger';

// 알림 설정 값. 'Y'=켜짐, 'N'=꺼짐. (member.record_alarm 등 Char(1)과 동일)
export type AlarmFlag = 'Y' | 'N';

export class NotificationSettingsResponseDto {
  // 기록 리마인더 알림
  @ApiProperty({
    enum: ['Y', 'N'],
    example: 'Y',
    description:
      '기록 리마인더·연속기록(N102·N105) 알림. N이면 인앱·푸시 모두 발송하지 않음',
  })
  recordAlarm!: AlarmFlag;

  // 리포트 도착 알림
  @ApiProperty({
    enum: ['Y', 'N'],
    example: 'Y',
    description:
      '리포트 도착·PDF 저장(N103·N104) 알림. N이면 인앱은 표시하고 푸시만 발송하지 않음',
  })
  reportAlarm!: AlarmFlag;

  // 위험 신호 알림
  @ApiProperty({
    enum: ['Y', 'N'],
    example: 'N',
    description:
      '위험 신호(N101) 알림. N이면 인앱은 표시하고 푸시만 발송하지 않음',
  })
  warnAlarm!: AlarmFlag;
}
