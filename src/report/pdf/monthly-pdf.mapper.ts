import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import type {
  MonthlyPdfDailyRow,
  MonthlyPdfDiscomfortRow,
  MonthlyPdfFoodTag,
  MonthlyPdfLifeFactorRow,
  MonthlyPdfReportData,
  MonthlyPdfSourceData,
  MonthlyPdfStoolDistribution,
  PdfStoolCode,
} from '../dto/pdf-report-data.dto';
import { toKstDateKey } from '@/common/utils/kst-date.util';
import {
  isSevereStomachPain,
  isStomachPainAtLeastMild,
} from '@/common/utils/stomach-pain.util';
import {
  hasBowelMovementAt,
  type TimedBowelRecord,
} from '../util/bowel-record.util';

type CodedDiscomfortField = 'distension' | 'remainingFeeling' | 'urgency';

const STOOL_ORDER: PdfStoolCode[] = ['M', 'H', 'T'];

const STOOL_LABEL: Record<PdfStoolCode, string> = {
  M: '보통',
  H: '딱딱',
  T: '묽음',
};

const DOMINANT_STOOL_LABEL: Record<PdfStoolCode, string> = {
  M: '보통 변',
  H: '딱딱한 변',
  T: '묽은 변',
};

function isCodedDiscomfort(value: string | null): boolean {
  return value === 'M' || value === 'L';
}

const DISCOMFORTS: Array<{
  label: string;
  matches: (record: BoogleRecordForReport) => boolean;
}> = [
  {
    label: '복통 (약간 이상)',
    matches: (record) => isStomachPainAtLeastMild(record.stomach),
  },
  {
    label: '복부 팽만',
    matches: (record) => isCodedDiscomfort(record.distension),
  },
  {
    label: '잔변감',
    matches: (record) => isCodedDiscomfort(record.remainingFeeling),
  },
  {
    label: '급박감',
    matches: (record) => isCodedDiscomfort(record.urgency),
  },
];

const DAILY_FOOD_LABEL: Record<string, string> = {
  음주: '음주',
  야식: '야식',
  '자극적인 음식': '자극적',
  '기름진 음식': '기름진',
  유제품: '유제품',
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isStoolCode(value: string | null): value is PdfStoolCode {
  return value === 'M' || value === 'H' || value === 'T';
}

function utcDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKeyFromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDotDate(dateKey: string): string {
  return dateKey.replaceAll('-', '.');
}

function inclusiveDays(startDate: string, endDate: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (
    Math.floor(
      (utcDateFromKey(endDate).getTime() -
        utcDateFromKey(startDate).getTime()) /
        millisecondsPerDay,
    ) + 1
  );
}

function buildStoolDistribution(
  records: BoogleRecordForReport[],
): MonthlyPdfStoolDistribution[] {
  const counts: Record<PdfStoolCode, number> = {
    M: 0,
    H: 0,
    T: 0,
  };

  for (const record of records) {
    if (record.hasBowel && isStoolCode(record.stoolSimple)) {
      counts[record.stoolSimple] += 1;
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return STOOL_ORDER.map((code) => ({
    code,
    label: STOOL_LABEL[code],
    count: counts[code],
    ratio: total === 0 ? 0 : round1((counts[code] / total) * 100),
  }));
}

function resolveDominantStoolCodeFromCounts(
  counts: Readonly<Record<PdfStoolCode, number>>,
): PdfStoolCode | null {
  const dominant = STOOL_ORDER.reduce((current, candidate) =>
    counts[candidate] > counts[current] ? candidate : current,
  );

  return counts[dominant] === 0 ? null : dominant;
}

function resolveDominantStoolCode(
  records: BoogleRecordForReport[],
): PdfStoolCode | null {
  const counts: Record<PdfStoolCode, number> = {
    M: 0,
    H: 0,
    T: 0,
  };

  for (const record of records) {
    if (record.hasBowel && isStoolCode(record.stoolSimple)) {
      counts[record.stoolSimple] += 1;
    }
  }

  return resolveDominantStoolCodeFromCounts(counts);
}

function resolveDominantStoolByDates(
  symptomRecords: BoogleRecordForReport[],
  allRecordsByDate: Map<string, BoogleRecordForReport[]>,
): string {
  const symptomDateKeys = [
    ...new Set(symptomRecords.map((record) => toKstDateKey(record.regDate))),
  ];
  const dailyCodes = symptomDateKeys
    .map((dateKey) =>
      resolveDominantStoolCode(allRecordsByDate.get(dateKey) ?? []),
    )
    .filter((code): code is PdfStoolCode => code !== null);

  if (dailyCodes.length === 0) return '-';

  const counts: Record<PdfStoolCode, number> = {
    M: 0,
    H: 0,
    T: 0,
  };

  for (const code of dailyCodes) {
    counts[code] += 1;
  }

  const dominant = resolveDominantStoolCodeFromCounts(counts);

  return dominant === null ? '-' : DOMINANT_STOOL_LABEL[dominant];
}

function buildDiscomfortRows(
  records: BoogleRecordForReport[],
): MonthlyPdfDiscomfortRow[] {
  const recordsByDate = new Map<string, BoogleRecordForReport[]>();

  for (const record of records) {
    const dateKey = toKstDateKey(record.regDate);
    const dailyRecords = recordsByDate.get(dateKey) ?? [];
    dailyRecords.push(record);
    recordsByDate.set(dateKey, dailyRecords);
  }

  return DISCOMFORTS.map(({ label, matches }) => {
    const matched = records.filter(matches);

    return {
      label,
      count: matched.length,
      dominantStool: resolveDominantStoolByDates(matched, recordsByDate),
    };
  });
}

function buildLifeFactorRows(
  records: LifeRecordForReport[],
): MonthlyPdfLifeFactorRow[] {
  return [
    {
      label: '수면',
      lowCount: records.filter((record) => record.sleep === 'B').length,
      normalCount: records.filter((record) => record.sleep === 'N').length,
      highCount: records.filter((record) => record.sleep === 'G').length,
    },
    {
      label: '수분',
      lowCount: records.filter((record) => record.water === 'L').length,
      normalCount: records.filter((record) => record.water === 'N').length,
      highCount: records.filter((record) => record.water === 'H').length,
    },
    {
      label: '스트레스',
      lowCount: records.filter((record) => record.stress === 'L').length,
      normalCount: records.filter((record) => record.stress === 'N').length,
      highCount: records.filter((record) => record.stress === 'H').length,
    },
  ];
}

function buildTopFoodTags(records: LifeRecordForReport[]): MonthlyPdfFoodTag[] {
  const counts = new Map<string, number>();

  for (const record of records) {
    for (const { food } of record.foodTags) {
      counts.set(food.name, (counts.get(food.name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko-KR'))
    .slice(0, 2);
}

// 불편감 코드: 'L'(Large) = 심함, 'M'(Medium) = 약간. 생활 요인의 'L'(Low)과 의미가 다름.
function codedSeverity(value: string | null): number {
  if (value === 'L') return 2;
  if (value === 'M') return 1;
  return 0;
}

function maxCodedSeverity(
  records: BoogleRecordForReport[],
  field: CodedDiscomfortField,
): number {
  return records.reduce(
    (max, record) => Math.max(max, codedSeverity(record[field])),
    0,
  );
}

function buildDailyDiscomfort(records: BoogleRecordForReport[]): string {
  const labels: string[] = [];

  const maxStomachPain = records.reduce(
    (max, record) => Math.max(max, record.stomach ?? 0),
    0,
  );

  if (isSevereStomachPain(maxStomachPain)) {
    labels.push('복통 심함');
  } else if (isStomachPainAtLeastMild(maxStomachPain)) {
    labels.push('복통 약간');
  }

  const distension = maxCodedSeverity(records, 'distension');
  if (distension === 1) labels.push('복부팽만 약간');
  if (distension === 2) labels.push('복부팽만 심함');

  const remaining = maxCodedSeverity(records, 'remainingFeeling');
  if (remaining === 1) labels.push('잔변감 약간');
  if (remaining === 2) labels.push('잔변감 있음');

  const urgency = maxCodedSeverity(records, 'urgency');
  if (urgency === 1) labels.push('급박감 약간');
  if (urgency === 2) labels.push('급박감 있음');

  return labels.length === 0 ? '-' : labels.join(', ');
}

function buildDailyStoolState(records: BoogleRecordForReport[]): string {
  const latestBowelRecord = records
    .filter(hasBowelMovementAt)
    .reduce<TimedBowelRecord | undefined>((latest, record) => {
      if (
        latest === undefined ||
        record.bowelMovementAt.getTime() > latest.bowelMovementAt.getTime()
      ) {
        return record;
      }

      return latest;
    }, undefined);

  if (
    latestBowelRecord === undefined ||
    !isStoolCode(latestBowelRecord.stoolSimple)
  ) {
    return '-';
  }

  const bristol =
    latestBowelRecord.stoolBristol === null
      ? ''
      : `(${latestBowelRecord.stoolBristol}형)`;

  return `${STOOL_LABEL[latestBowelRecord.stoolSimple]}${bristol}`;
}

function buildDailyMainLife(record: LifeRecordForReport | undefined): string {
  if (record === undefined) return '-';

  const labels: string[] = [];

  if (record.sleep === 'B') labels.push('수면 부족');
  if (record.stress === 'H') labels.push('스트레스 높음');
  if (record.water === 'L') labels.push('수분 부족');
  if (record.mealRegular === 'I') labels.push('식사 불규칙');

  for (const { food } of record.foodTags) {
    const label = DAILY_FOOD_LABEL[food.name];
    if (label !== undefined && !labels.includes(label)) {
      labels.push(label);
    }
  }

  return labels.length === 0 ? '-' : labels.join(', ');
}

function buildDailyRows(
  startDate: string,
  endDate: string,
  boogleRecords: BoogleRecordForReport[],
  lifeRecords: LifeRecordForReport[],
): MonthlyPdfDailyRow[] {
  const boogleByDate = new Map<string, BoogleRecordForReport[]>();

  for (const record of boogleRecords) {
    const dateKey = toKstDateKey(record.regDate);
    const dailyRecords = boogleByDate.get(dateKey) ?? [];
    dailyRecords.push(record);
    boogleByDate.set(dateKey, dailyRecords);
  }

  const lifeByDate = new Map(
    lifeRecords.map((record) => [toKstDateKey(record.regDate), record]),
  );

  const rows: MonthlyPdfDailyRow[] = [];
  const end = utcDateFromKey(endDate);

  for (
    let cursor = utcDateFromKey(startDate);
    cursor <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    const dateKey = dateKeyFromUtcDate(cursor);
    const dailyBoogleRecords = boogleByDate.get(dateKey) ?? [];
    const lifeRecord = lifeByDate.get(dateKey);

    rows.push({
      date: `${cursor.getUTCMonth() + 1}/${cursor.getUTCDate()}`,
      bowel: dailyBoogleRecords.some((record) => record.hasBowel)
        ? '있음'
        : '없음',
      stoolState: buildDailyStoolState(dailyBoogleRecords),
      discomfort: buildDailyDiscomfort(dailyBoogleRecords),
      mainLife: buildDailyMainLife(lifeRecord),
    });
  }

  return rows;
}

export function buildMonthlyPdfData(
  source: MonthlyPdfSourceData,
): MonthlyPdfReportData {
  const periodDays = inclusiveDays(source.startDate, source.endDate);

  return {
    period: {
      startDate: source.startDate,
      endDate: source.endDate,
      generatedDate: source.generatedDate,
      displayRange:
        `${formatDotDate(source.startDate)} - ` +
        `${formatDotDate(source.endDate)} (${periodDays}일)`,
      displayGeneratedDate: formatDotDate(source.generatedDate),
      inclusiveDays: periodDays,
    },
    summary: {
      bowelCount: source.bowelCount,
      intervalAvg: source.intervalAvg,
      completionScore: source.completionScore,
    },
    stoolDistribution: buildStoolDistribution(source.boogleRecords),
    discomfortRows: buildDiscomfortRows(source.boogleRecords),
    lifeFactorRows: buildLifeFactorRows(source.lifeRecords),
    topFoodTags: buildTopFoodTags(source.lifeRecords),
    patternCards: source.patternCards,
    dailyRows: buildDailyRows(
      source.startDate,
      source.endDate,
      source.boogleRecords,
      source.lifeRecords,
    ),
  };
}
