import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { AlarmFlag } from './notification-settings-response.dto';

/**
 * 알림 설정 부분 변경. 전달된 필드만 반영한다(단일 필드 변경 지원).
 * 각 값은 'Y'(켜짐) 또는 'N'(꺼짐)이며, 생략된 필드는 기존 값을 유지한다.
 */
export class UpdateNotificationSettingsRequestDto {
  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '기록 리마인더 알림' })
  @IsOptional()
  @IsIn(['Y', 'N'])
  recordAlarm?: AlarmFlag;

  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '리포트 도착 알림' })
  @IsOptional()
  @IsIn(['Y', 'N'])
  reportAlarm?: AlarmFlag;

  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '위험 신호 알림' })
  @IsOptional()
  @IsIn(['Y', 'N'])
  warnAlarm?: AlarmFlag;
}
