import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  data?: unknown;
}

// 인터페이스는 런타임에서 날라가기때문에 오류 swagger 문서화를 위해 클래스로 작성함
export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({
    type: Boolean,
    example: false,
    description: '실패 응답에서는 항상 false',
  })
  success!: false;

  @ApiProperty({
    type: String,
    example: 'GUIDE_INVALID_ID',
    description: '도메인 또는 공통 오류 코드',
  })
  code!: string;

  @ApiProperty({
    type: String,
    example: 'guideId는 1 이상의 숫자여야 합니다.',
    description: '사용자에게 전달할 오류 메시지',
  })
  message!: string;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      '오류와 관련된 추가 정보입니다. BusinessException.data가 있을 때만 포함됩니다.',
  })
  data?: unknown;
}
