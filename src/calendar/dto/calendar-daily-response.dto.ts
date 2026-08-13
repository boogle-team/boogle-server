import { ApiProperty } from '@nestjs/swagger';

export class TagDto {
  @ApiProperty({ example: 7, description: '태그 ID' })
  id!: number;

  @ApiProperty({ example: '야식', description: '태그명' })
  name!: string;
}

export class FoodDto {
  @ApiProperty({ example: 2, description: '음식 태그 ID' })
  id!: number;

  @ApiProperty({ example: '기름진 음식', description: '음식 태그명' })
  name!: string;
}

export class MedicineDto {
  @ApiProperty({ example: 1, description: '약 ID' })
  id!: number;

  @ApiProperty({ example: '유산균', description: '약 이름' })
  name!: string;
}

export class BoogleRecordDetailDto {
  @ApiProperty({ example: 100, description: '기록 ID' })
  id!: number;

  // 어느 날짜의 기록인지(KST 자정으로 저장됨). 실제 배변 시각은 bowelMovementAt을 쓴다.
  @ApiProperty({
    example: '2026-06-16T15:00:00.000Z',
    description:
      '기록 날짜. KST 자정으로 저장되므로 시각 표시에 사용하지 않는다(배변 시각은 bowelMovementAt)',
  })
  regDate!: Date;

  // 배변 시각(KST `HH:mm`). 기록하지 않았으면 null.
  @ApiProperty({
    nullable: true,
    example: '17:30',
    description: '배변 시각(KST HH:mm). 기록하지 않았으면 null',
  })
  bowelMovementAt!: string | null;

  @ApiProperty({ example: true, description: '배변 여부' })
  hasBowel!: boolean;

  @ApiProperty({
    nullable: true,
    example: 4,
    description: '브리스톨 척도 1~7. 배변하지 않았으면 null',
  })
  stoolBristol!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'M',
    description:
      '변 상태(H 딱딱 / M 보통 / T 묽음). stoolBristol로부터 서버가 자동 변환',
  })
  stoolSimple!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'C',
    description: '배변 느낌(C 편안 / N 보통 / H 힘듦)',
  })
  bowelFeeling!: string | null;

  // 복통 강도(숫자). boogle_record.stomach가 문자 코드→숫자로 변경됨.
  @ApiProperty({
    nullable: true,
    example: 1,
    description: '복통 강도(0~4). 0 없음 / 1~2 중간 / 3~4 심함',
  })
  stomach!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '복부팽만(N 없음 / M 보통 / L 심함)',
  })
  distension!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '잔변감(N 없음 / M 보통 / L 심함)',
  })
  remainingFeeling!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '긴박감(N 없음 / M 보통 / L 심함)',
  })
  urgency!: string | null;

  /**
   * 배변 소요 시간 코드: 1=5분 이하, 2=5~15분, 3=15분 이상.
   * (life_record.sleepTime과 동일한 3단계 규칙을 잠정 적용 — 팀 공통 문서
   * §3(배변 기록)에 아직 정의되어 있지 않음. docs/api/home-calendar-api.md §9 참고)
   */
  @ApiProperty({
    nullable: true,
    example: 2,
    description: '배변 소요 시간(1 5분 이하 / 2 5~15분 / 3 15분 이상)',
  })
  takenTime!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '배변 양(S 적음 / N 보통 / M 많음)',
  })
  amount!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'B',
    description:
      '변 색상(B 갈색 / D 어두운색 / N 검은색 / R 붉은색 / G 회색 / E 초록색)',
  })
  color!: string | null;

  @ApiProperty({
    nullable: true,
    example: null,
    description: '수정 일시. 수정하지 않았으면 null',
  })
  updatedAt!: Date | null;
}

export class LifeRecordDetailDto {
  @ApiProperty({ example: 55, description: '생활 기록 ID' })
  id!: number;

  @ApiProperty({
    example: '2026-06-17T21:00:00.000Z',
    description: '기록 일시',
  })
  regDate!: Date;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '수면(G 좋음 / N 보통 / B 부족)',
  })
  sleep!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'L',
    description: '스트레스(L 낮음 / N 보통 / H 높음)',
  })
  stress!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'H',
    description: '수분(L 부족 / N 보통 / H 충분)',
  })
  water!: string | null;

  @ApiProperty({
    nullable: true,
    example: 3,
    description: '물 섭취량(잔 수, 1잔≈200ml). water(3단계)와 별개 필드',
  })
  waterIntake!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'R',
    description: '식사 규칙성(R 규칙 / N 보통 / I 불규칙)',
  })
  mealRegular!: string | null;

  @ApiProperty({
    nullable: true,
    example: 2,
    description: '수면 시간(1 5시간 이하 / 2 5~7시간 / 3 7시간 이상)',
  })
  sleepTime!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'L',
    description: '운동(N 안함 / L 가볍게 / H 충분히)',
  })
  exercise!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'O',
    description: '카페인(N 없음 / O 1잔 / M 2잔 이상)',
  })
  caffeine!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '외출(N 평소와 같음 / L 외출 많음 / T 여행 중)',
  })
  outing!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'N',
    description: '호르몬(N 없음 / M 생리 중 / E 변화 있음)',
  })
  hormone!: string | null;

  @ApiProperty({
    nullable: true,
    example: '어제 회식에서 술을 많이 마셨어요.',
    description: '생활 메모(한 줄)',
  })
  memo!: string | null;

  @ApiProperty({
    type: [String],
    example: ['음주', '야식'],
    description: 'AI가 메모에서 추출한 태그. 없으면 []',
  })
  autoTags!: string[];

  @ApiProperty({ type: [TagDto], description: '연결 태그. 없으면 []' })
  tags!: TagDto[];

  @ApiProperty({ type: [FoodDto], description: '오늘 먹은 것. 없으면 []' })
  foods!: FoodDto[];

  @ApiProperty({ type: [MedicineDto], description: '복용 약. 없으면 []' })
  medicines!: MedicineDto[];

  @ApiProperty({
    nullable: true,
    example: null,
    description: '수정 일시. 수정하지 않았으면 null',
  })
  updatedAt!: Date | null;
}

export class CalendarDailyResponseDto {
  @ApiProperty({ example: '2026-06-17', description: '조회 날짜(YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({
    type: [BoogleRecordDetailDto],
    description: '해당 날짜 부글 기록 전체(하루 여러 건 가능). 없으면 []',
  })
  boogleRecords!: BoogleRecordDetailDto[];

  @ApiProperty({
    type: LifeRecordDetailDto,
    nullable: true,
    description: '해당 날짜 생활 기록(1건). 없으면 null',
  })
  lifeRecord!: LifeRecordDetailDto | null;
}
