import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    type: String,
    example: 'ok',
    description: 'DB 연결까지 정상일 때 항상 ok',
  })
  status: string;
}
