import type { MonthlyPatternCardDto } from './monthly-report-response.dto';
import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from './report-record.dto';

export interface PdfReportResult {
  buffer: Buffer;
  filename: string;
}

export interface MonthlyPdfSourceData {
  startDate: string;
  endDate: string;
  generatedDate: string;
  bowelCount: number;
  intervalAvg: number;
  completionScore: number;
  boogleRecords: BoogleRecordForReport[];
  lifeRecords: LifeRecordForReport[];
  patternCards: MonthlyPatternCardDto[];
}

export interface MonthlyPdfPeriod {
  startDate: string;
  endDate: string;
  generatedDate: string;
  displayRange: string;
  displayGeneratedDate: string;
  inclusiveDays: number;
}

export interface MonthlyPdfSummary {
  bowelCount: number;
  intervalAvg: number;
  completionScore: number;
}

export type PdfStoolCode = 'M' | 'H' | 'T';

export interface MonthlyPdfStoolDistribution {
  code: PdfStoolCode;
  label: string;
  count: number;
  ratio: number;
}

export interface MonthlyPdfDiscomfortRow {
  label: string;
  count: number;
  dominantStool: string;
}

export interface MonthlyPdfLifeFactorRow {
  label: '수면' | '수분' | '스트레스';
  lowCount: number;
  normalCount: number;
  highCount: number;
}

export interface MonthlyPdfFoodTag {
  name: string;
  count: number;
}

export interface MonthlyPdfDailyRow {
  date: string;
  bowel: string;
  stoolState: string;
  discomfort: string;
  mainLife: string;
}

export interface MonthlyPdfReportData {
  period: MonthlyPdfPeriod;
  summary: MonthlyPdfSummary;
  stoolDistribution: MonthlyPdfStoolDistribution[];
  discomfortRows: MonthlyPdfDiscomfortRow[];
  lifeFactorRows: MonthlyPdfLifeFactorRow[];
  topFoodTags: MonthlyPdfFoodTag[];
  patternCards: MonthlyPatternCardDto[];
  dailyRows: MonthlyPdfDailyRow[];
}
