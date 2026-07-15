import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SocialLinkRequestDto {
  @ApiProperty({
    example: 'link-ticket-value',
    description: 'AUTH-07에서 발급된 일회용 계정 연동 티켓',
  })
  @IsString({ message: 'AUTH_LINK_TICKET_REQUIRED' })
  @IsNotEmpty({ message: 'AUTH_LINK_TICKET_REQUIRED' })
  linkTicket!: string;
}
