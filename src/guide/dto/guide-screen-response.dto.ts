export type GuideCategory = 'P' | 'H' | 'W';
export type GuideFeedbackStatus = 'G' | 'A' | 'N';

export type GuideSectionKey = 'PATTERN' | 'HEALTH' | 'WARNING';

export type PatternGuideDataStatus = 'AVAILABLE' | 'INSUFFICIENT';

export interface GuidePeriodDto {
  type: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
}

export interface GuideNoticeDto {
  code: string;
  message: string;
}

export interface GuideCardDto {
  guideContentId: number;
  category: GuideCategory;
  title: string;
  summary: string;
  feedbackStatus: GuideFeedbackStatus | null;
}

export interface MatchedEvidenceDto {
  sourceTable: 'weekly_record' | 'boogle_record' | 'life_record';
  sourceField: string;
  condition: string;
  count: number;
}

export interface PatternGuideDto extends GuideCardDto {
  category: 'P';
  ruleCode: string;
  matchedReason: string;
  matchedEvidence: MatchedEvidenceDto | null;
}

export interface PatternGuideSectionDto {
  category: 'P';
  categoryLabel: '패턴 기반';
  sectionTitle: string;
  sectionDescription: string;

  period: GuidePeriodDto;

  dataStatus: PatternGuideDataStatus;
  recordedDays: number;
  requiredDays: number;

  notice: GuideNoticeDto | null;
  guides: PatternGuideDto[];
}

export interface HealthGuideSectionDto {
  category: 'H';
  categoryLabel: '장 건강';
  sectionTitle: string;
  sectionDescription: string;
  guides: GuideCardDto[];
}

export interface WarningFlagDto {
  flagCode: 'FLAG_BLOOD_RED' | 'FLAG_BLOOD_BLACK' | 'FLAG_PAIN_SEVERE';
  label: string;
  detectedDate: string;
}

export interface WarningGuideSectionDto {
  category: 'W';
  categoryLabel: '주의 신호';
  sectionTitle: string;
  sectionDescription: string;

  period: GuidePeriodDto;

  highlighted: boolean;
  detectedFlags: WarningFlagDto[];
  guides: GuideCardDto[];
}

export interface GuideScreenResponseDto {
  /**
   * 객체 프로퍼티 순서에 의존하지 않고
   * 프론트엔드에서 섹션 위치를 결정하기 위한 값
   */
  sectionOrder: GuideSectionKey[];

  patternGuideSection: PatternGuideSectionDto;
  healthGuideSection: HealthGuideSectionDto;
  warningGuideSection: WarningGuideSectionDto;
}
