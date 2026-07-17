import { ApiProperty } from '@nestjs/swagger';

export class MedicineDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '감기약' })
  name: string;
}

export class MedicineListResponseDto {
  @ApiProperty({
    type: [MedicineDto],
    example: [
      { id: 1, name: '감기약' },
      { id: 2, name: '항생제' },
      { id: 3, name: '유산균' },
      { id: 4, name: '철분제' },
      { id: 5, name: '변비약' },
      { id: 6, name: '해당 없음' },
    ],
  })
  items: MedicineDto[];
}
