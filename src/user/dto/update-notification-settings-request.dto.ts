import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';
import type { AlarmFlag } from './notification-settings-response.dto';

/**
 * 알림 설정 부분 변경. 전달된 필드만 반영한다(단일 필드 변경 지원).
 * 각 값은 'Y'(켜짐) 또는 'N'(꺼짐)이며, 생략된 필드는 기존 값을 유지한다.
 *
 * @IsOptional 대신 @ValidateIf(value !== undefined)를 쓰는 이유: @IsOptional은
 * null도 생략으로 간주해 @IsIn을 건너뛰는데, 서비스는 null !== undefined이면
 * Prisma update에 그대로 넘겨 컬럼을 null로 만든다. { "recordAlarm": null }은
 * 잘못된 값이므로 400으로 막아야 하며, undefined만 생략으로 처리한다.
 */
export class UpdateNotificationSettingsRequestDto {
  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '기록 리마인더 알림' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['Y', 'N'])
  recordAlarm?: AlarmFlag;

  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '리포트 도착 알림' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['Y', 'N'])
  reportAlarm?: AlarmFlag;

  @ApiPropertyOptional({ enum: ['Y', 'N'], description: '위험 신호 알림' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['Y', 'N'])
  warnAlarm?: AlarmFlag;
}
