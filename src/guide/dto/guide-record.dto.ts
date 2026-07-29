export interface GuideContentRow {
  id: number;
  subtitle: string | null;
  content: string;
}

export interface GuideAdviceRow {
  id: number;
  content: string;
}

export interface GuideDetailRow {
  id: number;
  title: string;
  summary: string;
  source: string | null;
  category: string;
  status: string;
  guideContents: GuideContentRow[];
  guideAdvices: GuideAdviceRow[];
}

export interface WarningRecordRow {
  regDate: Date;
  hasBowel: boolean;
  color: string | null;
  stomach: string | null;
}

export interface WarningDetailRecordRow {
  id: bigint;
  regDate: Date;
  color: string | null;
  stomach: string | null;
}
