import type { WeeklyRuleCode } from '@/report/pattern/weekly-pattern.constants';
import type {
  GuideCategory,
  GuideFeedbackStatus,
  GuidePeriodDto,
} from './guide-screen-response.dto';

export interface GuideContentItemDto {
  contentId: number;
  order: number;
  subtitle: string | null;
  content: string;
}

export interface GuideAdviceItemDto {
  adviceId: number;
  order: number;
  content: string;
}

export interface RecommendedGuideDto {
  guideId: number;
  title: string;
  summary: string;
}

export interface PatternEvidenceMetricDto {
  key: string;
  label: string;
  value: number;
  threshold: number;
  unit: 'DAY' | 'COUNT' | 'PERCENT' | 'MINUTE';
}

export interface PatternReasonItemDto {
  ruleCode: WeeklyRuleCode;
  level: 'OK' | 'WARN' | 'DANGER';
  title: string;
  description: string | null;
  evidence: PatternEvidenceMetricDto[];
}

export interface PatternRecordStatusDto {
  dataStatus: 'ENOUGH' | 'INSUFFICIENT';
  recordedDays: number;
  requiredDays: number;
  completionScore: number;
}

export interface PatternGuideReasonDto {
  period: GuidePeriodDto;
  recordStatus: PatternRecordStatusDto;
  matched: boolean;
  matchedRuleCodes: WeeklyRuleCode[];
  matchedPatterns: PatternReasonItemDto[];
}

export interface WarningDetailFlagDto {
  flagCode: 'FLAG_BLOOD_RED' | 'FLAG_BLOOD_BLACK' | 'FLAG_PAIN_SEVERE';
  label: string;
  detectedDate: string;
  sourceRecordId: string;
}

export interface WarningGuideAnalysisDto {
  period: GuidePeriodDto;
  matched: boolean;
  detectedFlags: WarningDetailFlagDto[];
}

interface GuideDetailBaseDto {
  guideId: number;
  category: GuideCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  contents: GuideContentItemDto[];
  advices: GuideAdviceItemDto[];
  recommendedGuides: RecommendedGuideDto[];
  feedbackStatus: GuideFeedbackStatus | null;
  patternReason: PatternGuideReasonDto | null;
  warningAnalysis: WarningGuideAnalysisDto | null;
}

export interface HealthGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'H';
  categoryLabel: '장 건강';
  patternReason: null;
  warningAnalysis: null;
}

export interface PatternGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'P';
  categoryLabel: '패턴 기반';
  patternReason: PatternGuideReasonDto;
  warningAnalysis: null;
}

export interface WarningGuideDetailResponseDto extends GuideDetailBaseDto {
  category: 'W';
  categoryLabel: '주의 신호';
  patternReason: null;
  warningAnalysis: WarningGuideAnalysisDto;
}

export type GuideDetailResponseDto =
  | HealthGuideDetailResponseDto
  | PatternGuideDetailResponseDto
  | WarningGuideDetailResponseDto;
