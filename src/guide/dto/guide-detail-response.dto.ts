import type {
  GuideCategory,
  GuideFeedbackStatus,
  GuidePeriodDto,
} from './guide-screen-response.dto';

export interface GuideDetailRuleDto {
  ruleCode: string;
  condition: string | null;
}

export interface PatternGuideEvidenceDto {
  matched: boolean;
  sourceTable: 'weekly_record' | 'boogle_record' | 'life_record';
  sourceField: string;
  condition: string;
  count: number;
  description: string;
}

export interface WarningDetailFlagDto {
  flagCode: 'FLAG_BLOOD_RED' | 'FLAG_BLOOD_BLACK' | 'FLAG_PAIN_SEVERE';

  label: string;
  detectedDate: string;
  sourceRecordId: string;
}

export interface WarningGuideEvidenceDto {
  matched: boolean;
  detectedFlags: WarningDetailFlagDto[];
}

export interface PatternRelatedRecordsDto {
  totalRecordedDays: number;
  bowelCount: number;
  hardStoolCount: number;
  looseStoolCount: number;
  lowSleepDays: number;
  highStressDays: number;
  lowWaterDays: number;
  highCaffeineDays: number;
}

interface GuideDetailBaseDto {
  guideContentId: number;
  category: GuideCategory;
  categoryLabel: string;
  title: string;
  content: string;
  feedbackStatus: GuideFeedbackStatus | null;
}

export interface PatternGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'P';
  categoryLabel: '패턴 기반';
  period: GuidePeriodDto;
  rule: GuideDetailRuleDto | null;
  matchedEvidence: PatternGuideEvidenceDto | null;
  relatedRecords: PatternRelatedRecordsDto;
}

export interface HealthGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'H';
  categoryLabel: '장 건강';
  period: null;
  rule: null;
  matchedEvidence: null;
  relatedRecords: null;
}

export interface WarningGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'W';
  categoryLabel: '주의 신호';
  period: GuidePeriodDto;
  rule: null;
  matchedEvidence: WarningGuideEvidenceDto;
  relatedRecords: null;
}

export type GuideDetailResponseDto =
  | PatternGuideDetailResponseDto
  | HealthGuideDetailResponseDto
  | WarningGuideDetailResponseDto;
