export interface GuideContentRow {
  id: number;
  subtitle: string | null;
  content: string;
}

export interface GuideAdviceRow {
  id: number;
  subtitle: string | null;
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
