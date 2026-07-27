import type { MonthlyPdfReportData } from '../dto/pdf-report-data.dto';
import { renderMonthlyPdf } from './monthly-pdf.renderer';

interface MonthlyPdfFixtureOptions {
  dailyRowCount?: number;
  longPatternDescriptions?: boolean;
  includePatterns?: boolean;
}

function createMonthlyPdfFixture(
  options: MonthlyPdfFixtureOptions = {},
): MonthlyPdfReportData {
  const dailyRowCount = options.dailyRowCount ?? 15;
  const endDay = String(dailyRowCount).padStart(2, '0');
  const includePatterns = options.includePatterns ?? true;
  const patternDescription = options.longPatternDescriptions
    ? '수분이 부족했던 날에 딱딱한 변이 함께 나타나는 경향이 반복해서 확인됐어요. '
        .repeat(8)
        .trim()
    : '수분이 부족했던 날에 딱딱한 변이 함께 나타난 날이 많았어요.';

  return {
    period: {
      startDate: '2026-07-01',
      endDate: `2026-07-${endDay}`,
      generatedDate: '2026-07-15',
      displayRange: `2026.07.01 - 2026.07.${endDay} ` + `(${dailyRowCount}일)`,
      displayGeneratedDate: '2026.07.15',
      inclusiveDays: dailyRowCount,
    },
    summary: {
      bowelCount: 22,
      intervalAvg: 1.4,
      completionScore: 83,
    },
    stoolDistribution: [
      {
        code: 'M',
        label: '보통',
        count: 12,
        ratio: 55,
      },
      {
        code: 'H',
        label: '딱딱',
        count: 6,
        ratio: 27,
      },
      {
        code: 'T',
        label: '묽음',
        count: 4,
        ratio: 18,
      },
    ],
    discomfortRows: [
      {
        label: '복통 (약간 이상)',
        count: 4,
        dominantStool: '딱딱한 변',
      },
      {
        label: '복부 팽만',
        count: 3,
        dominantStool: '-',
      },
      {
        label: '잔변감',
        count: 2,
        dominantStool: '딱딱한 변',
      },
      {
        label: '급박감',
        count: 1,
        dominantStool: '묽은 변',
      },
    ],
    lifeFactorRows: [
      {
        label: '수면',
        lowCount: 8,
        normalCount: 14,
        highCount: 3,
      },
      {
        label: '수분',
        lowCount: 5,
        normalCount: 16,
        highCount: 4,
      },
      {
        label: '스트레스',
        lowCount: 10,
        normalCount: 12,
        highCount: 3,
      },
    ],
    topFoodTags: [
      {
        name: '야식',
        count: 5,
      },
      {
        name: '유제품',
        count: 3,
      },
    ],
    patternCards: includePatterns
      ? [
          {
            level: 'WARN',
            ruleCode: 'MONTHLY_LOW_WATER_WITH_HARD_STOOL',
            title: '수분 부족과 딱딱한 변',
            description: patternDescription,
            value: 12,
            threshold: 12,
            unit: 'DAY',
          },
          {
            level: 'WARN',
            ruleCode: 'MONTHLY_HARD_STOOL_RATIO',
            title: '딱딱한 변 경향',
            description: '이번 달 변 상태의 절반 이상이 딱딱했어요.',
            value: 55,
            threshold: 50,
            unit: 'PERCENT',
          },
        ]
      : [],
    dailyRows: Array.from({ length: dailyRowCount }, (_, index) => ({
      date: `7/${index + 1}`,
      bowel: index % 3 === 1 ? '없음' : '있음',
      stoolState:
        index % 3 === 0 ? '보통(4형)' : index % 3 === 1 ? '-' : '딱딱(2형)',
      discomfort: index % 4 === 0 ? '복통 약간, 잔변감 있음' : '-',
      mainLife: index % 5 === 0 ? '수면 부족, 수분 부족, 야식, 자극적' : '-',
    })),
  };
}

function countPdfPages(buffer: Buffer): number {
  const source = buffer.toString('latin1');
  return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

describe('renderMonthlyPdf', () => {
  it('15일 디자인 fixture는 빈 footer 페이지 없이 2페이지로 생성한다', async () => {
    const buffer = await renderMonthlyPdf(
      createMonthlyPdfFixture({
        dailyRowCount: 15,
      }),
    );

    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(10_000);
    expect(countPdfPages(buffer)).toBe(2);
  });

  it('31일과 긴 패턴은 필요한 만큼 페이지가 자연스럽게 늘어난다', async () => {
    const buffer = await renderMonthlyPdf(
      createMonthlyPdfFixture({
        dailyRowCount: 31,
        longPatternDescriptions: true,
      }),
    );
    const pageCount = countPdfPages(buffer);

    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pageCount).toBeGreaterThan(2);
  });

  it('감지 패턴이 없어도 일별 상세 기록까지 정상 PDF로 생성한다', async () => {
    const buffer = await renderMonthlyPdf(
      createMonthlyPdfFixture({
        dailyRowCount: 7,
        includePatterns: false,
      }),
    );

    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(countPdfPages(buffer)).toBe(2);
  });
});
