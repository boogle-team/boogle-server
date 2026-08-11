import { ApiProperty } from '@nestjs/swagger';

export class HomeUserDto {
  @ApiProperty({ example: 1, description: '회원 ID' })
  id!: number;

  @ApiProperty({ example: '땅콩잼', description: '닉네임' })
  nickname!: string;

  @ApiProperty({
    nullable: true,
    example: 'R',
    description:
      '최근 월간 유형 코드(R 규칙형 / C 변비경향형 / L 묽은변경향형 / I 생활영향형 / U 불규칙형 / N 기록부족형). 유형 산출 전이면 null',
  })
  userType!: string | null;

  @ApiProperty({
    nullable: true,
    example: '규칙형',
    description: '유형 한글 라벨. userType이 null이면 null',
  })
  userTypeLabel!: string | null;

  @ApiProperty({
    example: 12,
    description: '가입 후 경과일(가입일 = 1일째)',
  })
  joinedDays!: number;
}

export class HomeTodayDto {
  @ApiProperty({ example: '2026-05-12', description: '기준 날짜(YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({
    example: '오늘 부글 신호를 보냈어요!',
    description: '오늘 기록 상태 기반 인사 메시지',
  })
  greeting!: string;
}

export class WeekStripDayDto {
  @ApiProperty({ example: '2026-05-12', description: '날짜(YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({ example: true, description: '그날 부글 기록 존재 여부' })
  hasRecord!: boolean;
}

export class HomeBoogleRecordDto {
  @ApiProperty({ example: 100, description: '기록 ID' })
  id!: number;

  // 어느 날짜의 기록인지(KST 자정으로 저장됨). 실제 배변 시각은 bowelMovementAt을 쓴다.
  @ApiProperty({
    example: '2026-05-11T15:00:00.000Z',
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
}

export class HomeFoodDto {
  @ApiProperty({ example: 1, description: '음식 태그 ID' })
  id!: number;

  @ApiProperty({ example: '자극적인 음식', description: '음식 태그명' })
  name!: string;
}

export class HomeLifeRecordDto {
  @ApiProperty({ example: 55, description: '생활 기록 ID' })
  id!: number;

  @ApiProperty({
    example: '2026-05-12T21:00:00.000Z',
    description: '기록 일시',
  })
  regDate!: Date;

  @ApiProperty({
    nullable: true,
    example: 'B',
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
    example: 'L',
    description: '수분(L 부족 / N 보통 / H 충분)',
  })
  water!: string | null;

  @ApiProperty({
    nullable: true,
    example: 1,
    description: '물 섭취량(잔 수, 1잔≈200ml). water(3단계)와 별개 필드',
  })
  waterIntake!: number | null;

  @ApiProperty({
    nullable: true,
    example: 'R',
    description: '식사 규칙성(R 규칙 / N 보통 / I 불규칙)',
  })
  mealRegular!: string | null;

  // AI가 메모에서 추출한 태그(auto_tags 콤마 문자열을 배열로 파싱). "이날의 태그" 표시용.
  @ApiProperty({
    type: [String],
    example: ['음주', '자극적', '야식'],
    description: 'AI가 메모에서 추출한 태그. 없으면 []',
  })
  autoTags!: string[];

  @ApiProperty({
    type: [HomeFoodDto],
    description: '오늘 먹은 것 태그. 없으면 []',
  })
  foods!: HomeFoodDto[];
}

export class HomeWeeklyPatternDto {
  @ApiProperty({
    example: 'LOW_WATER_WITH_HARD_STOOL',
    description: '감지된 패턴 코드',
  })
  ruleCode!: string;

  @ApiProperty({ example: '수분 부족과 딱딱한 변', description: '패턴 제목' })
  label!: string;

  @ApiProperty({
    example: '수분이 부족했던 날 딱딱한 변이 함께 나타났어요.',
    description: '패턴 설명',
  })
  description!: string;
}

export class HomeResponseDto {
  @ApiProperty({ type: HomeUserDto })
  user!: HomeUserDto;

  @ApiProperty({ type: HomeTodayDto })
  today!: HomeTodayDto;

  @ApiProperty({ example: 2, description: '연속 기록 일수' })
  streak!: number;

  @ApiProperty({
    type: [WeekStripDayDto],
    description: '오늘이 포함된 주(일~토) 7일',
  })
  weekStrip!: WeekStripDayDto[];

  @ApiProperty({ example: 2, description: '오늘 부글 기록 건수' })
  boogleCount!: number;

  @ApiProperty({
    type: [HomeBoogleRecordDto],
    description: '오늘 부글 기록 요약 리스트(시간 오름차순). 없으면 []',
  })
  boogleRecords!: HomeBoogleRecordDto[];

  @ApiProperty({
    type: HomeLifeRecordDto,
    nullable: true,
    description: '오늘 생활 기록 요약. 없으면 null',
  })
  lifeRecord!: HomeLifeRecordDto | null;

  @ApiProperty({
    type: HomeWeeklyPatternDto,
    nullable: true,
    description: '이번 주 대표 패턴 1건. 없으면 null',
  })
  weeklyPattern!: HomeWeeklyPatternDto | null;
}
