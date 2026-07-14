export interface GuideContentRow {
  id: number;
  category: string | null;
  title: string;
  content: string;
}

export interface PatternGuideRuleRow {
  ruleCode: string | null;
  guideContent: GuideContentRow;
}

export interface WarningRecordRow {
  regDate: Date;
  hasBowel: boolean;
  color: string | null;
  stomach: string | null;
}

export interface GuideRuleRow {
  ruleCode: string | null;
  condition: string | null;
}

export interface GuideContentDetailRow {
  id: number;
  category: string | null;
  title: string;
  content: string;
  status: string;
  guideRules: GuideRuleRow[];
}

export interface WarningDetailRecordRow {
  id: bigint;
  regDate: Date;
  color: string | null;
  stomach: string | null;
}
