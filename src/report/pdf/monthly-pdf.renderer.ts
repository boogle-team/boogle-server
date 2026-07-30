import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';
import type {
  MonthlyPdfDailyRow,
  MonthlyPdfReportData,
} from '../dto/pdf-report-data.dto';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 42;
const RIGHT = 42;
const TOP = 38;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;

const CONTENT_BOTTOM = PAGE_HEIGHT - 60;
const FOOTER_LINE_HORIZONTAL_MARGIN = 40;
const FOOTER_NOTICE_RIGHT_MARGIN = 39;
const FOOTER_PAGE_NUMBER_BOTTOM_MARGIN = 22;
const FOOTER_LINE_TO_PAGE_NUMBER_GAP = 8;
const FOOTER_NOTICE_TO_LINE_GAP = 8;

const SECTION_TITLE_HEIGHT = 26;
const TABLE_HEADER_HEIGHT = 28;
const TABLE_MIN_ROW_HEIGHT = 28;

// 섹션 1
const SUMMARY_CARD_HEIGHT = 64;
const SUMMARY_CARD_GAP = 10;

// 섹션 2
const BAR_ROW_HEIGHT = 21;
const BAR_LABEL_X = 40;
const BAR_LABEL_WIDTH = 34;
const BAR_X = 74;
const BAR_WIDTH = 412;
const BAR_HEIGHT = 12;
const BAR_VALUE_RIGHT_MARGIN = 40;
const BAR_VALUE_X = BAR_X + BAR_WIDTH;
const BAR_VALUE_WIDTH = PAGE_WIDTH - BAR_VALUE_RIGHT_MARGIN - BAR_VALUE_X;

const PATTERN_LINE_GAP = 2;

const COLOR = {
  orange6: '#FF8253',
  yellow1: '#FEF9EF',
  yellow4: '#F9D89C',
  beige5: '#F9F7F5',
  beige6: '#F9F3ED',
  beige7: '#EEE7E1',
  gray6: '#C2C2C2',
  gray7: '#868484',
  gray8: '#615F5F',
  gray9: '#4E4B4B',
  danger: '#FF7675',
  white: '#FFFFFF',
} as const;

const FONT = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

const ASSET_PATH_CACHE = new Map<string, string>();

type PdfFontName = (typeof FONT)[keyof typeof FONT];

interface TextStyle {
  font: PdfFontName;
  size: number;
  color: string;
}

const TEXT_STYLE = {
  documentTitle: {
    font: FONT.semiBold,
    size: 9,
    color: COLOR.gray7,
  },
  period: {
    font: FONT.bold,
    size: 11,
    color: COLOR.gray8,
  },
  generatedDate: {
    font: FONT.regular,
    size: 8,
    color: COLOR.gray7,
  },
  disclaimer: {
    font: FONT.regular,
    size: 9,
    color: COLOR.gray9,
  },
  sectionTitle: {
    font: FONT.bold,
    size: 12,
    color: COLOR.gray9,
  },
  guide: {
    font: FONT.regular,
    size: 8,
    color: COLOR.gray7,
  },
  cardLabel: {
    font: FONT.medium,
    size: 9,
    color: COLOR.gray7,
  },
  cardValue: {
    font: FONT.bold,
    size: 18,
    color: COLOR.orange6,
  },
  barLabel: {
    font: FONT.bold,
    size: 10,
    color: COLOR.gray9,
  },
  barValue: {
    font: FONT.medium,
    size: 8.5,
    color: COLOR.gray8,
  },
  tableHeader: {
    font: FONT.bold,
    size: 10,
    color: COLOR.gray9,
  },
  tableLead: {
    font: FONT.semiBold,
    size: 10,
    color: COLOR.gray9,
  },
  tableBody: {
    font: FONT.regular,
    size: 10,
    color: COLOR.gray9,
  },
  patternTitle: {
    font: FONT.bold,
    size: 9,
    color: COLOR.gray9,
  },
  patternBody: {
    font: FONT.regular,
    size: 9,
    color: COLOR.gray9,
  },
  footer: {
    font: FONT.regular,
    size: 8,
    color: COLOR.gray7,
  },
} satisfies Record<string, TextStyle>;

interface Cursor {
  y: number;
}

interface TableColumn<T> {
  title: string;
  width: number;
  value: (row: T) => string;
  align?: 'left' | 'center' | 'right';
  bodyStyle?: TextStyle;
}

interface PatternCardLayout {
  titleWidth: number;
  descriptionWidth: number;
  titleHeight: number;
  descriptionHeight: number;
  cardHeight: number;
}

function applyTextStyle(
  doc: PDFKit.PDFDocument,
  style: TextStyle,
): PDFKit.PDFDocument {
  return doc.font(style.font).fontSize(style.size).fillColor(style.color);
}

function resolveAssetPath(...segments: string[]): string {
  const cacheKey = join(process.cwd(), ...segments);
  const cached = ASSET_PATH_CACHE.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const candidates = [
    join(process.cwd(), 'src', 'assets', ...segments),
    join(process.cwd(), 'dist', 'src', 'assets', ...segments),
    join(process.cwd(), 'dist', 'assets', ...segments),
    join(__dirname, '..', '..', 'assets', ...segments),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));

  if (found === undefined) {
    throw new Error(`PDF asset not found: ${segments.join('/')}`);
  }

  ASSET_PATH_CACHE.set(cacheKey, found);

  return found;
}

function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(
    FONT.regular,
    resolveAssetPath('fonts', 'Pretendard-Regular.ttf'),
  );
  doc.registerFont(
    FONT.medium,
    resolveAssetPath('fonts', 'Pretendard-Medium.ttf'),
  );
  doc.registerFont(
    FONT.semiBold,
    resolveAssetPath('fonts', 'Pretendard-SemiBold.ttf'),
  );
  doc.registerFont(FONT.bold, resolveAssetPath('fonts', 'Pretendard-Bold.ttf'));
  doc.font(FONT.regular);
}

function addContentPage(doc: PDFKit.PDFDocument, cursor: Cursor): void {
  doc.addPage({
    size: 'A4',
    margins: {
      top: TOP,
      left: LEFT,
      right: RIGHT,
      bottom: 0,
    },
  });
  cursor.y = TOP;
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  requiredHeight: number,
): boolean {
  if (cursor.y + requiredHeight <= CONTENT_BOTTOM) {
    return false;
  }

  addContentPage(doc, cursor);
  return true;
}

function drawFirstPageHeader(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  const logoPath = resolveAssetPath('logo', 'pdf.png');

  doc.image(logoPath, LEFT, 38, { width: 56 });

  applyTextStyle(doc, TEXT_STYLE.documentTitle).text(
    '배변·생활 패턴 기록 리포트',
    LEFT,
    68,
    {
      lineBreak: false,
    },
  );

  const rightX = 270;
  const rightWidth = PAGE_WIDTH - RIGHT - rightX;

  applyTextStyle(doc, TEXT_STYLE.period).text(
    data.period.displayRange,
    rightX,
    42,
    {
      width: rightWidth,
      align: 'right',
      lineBreak: false,
    },
  );

  applyTextStyle(doc, TEXT_STYLE.generatedDate).text(
    `생성일: ${data.period.displayGeneratedDate}`,
    rightX,
    63,
    {
      width: rightWidth,
      align: 'right',
      lineBreak: false,
    },
  );

  doc
    .moveTo(LEFT, 86)
    .lineTo(PAGE_WIDTH - RIGHT, 86)
    .lineWidth(1.2)
    .strokeColor(COLOR.orange6)
    .stroke();

  cursor.y = 96;
}

function measureTextHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  style: TextStyle,
  lineGap = 2,
): number {
  applyTextStyle(doc, style);
  return doc.heightOfString(text, {
    width,
    lineGap,
  });
}

function drawNotice(doc: PDFKit.PDFDocument, cursor: Cursor): void {
  const text =
    '이 문서는 부글 서비스에 사용자가 직접 기록한 데이터를 바탕으로 생성된 생활 패턴 요약입니다. ' +
    '의료 진단이나 질병 예측을 포함하지 않으며, 전문가 상담 시 참고 자료로 활용하실 수 있습니다.';
  const horizontalPadding = 12;
  const verticalPadding = 10;
  const textWidth = CONTENT_WIDTH - horizontalPadding * 2;
  const bodyHeight = measureTextHeight(
    doc,
    text,
    textWidth,
    TEXT_STYLE.disclaimer,
    2,
  );
  const boxHeight = bodyHeight + verticalPadding * 2;

  ensureSpace(doc, cursor, boxHeight);

  doc
    .roundedRect(LEFT, cursor.y, CONTENT_WIDTH, boxHeight, 6)
    .fill(COLOR.yellow1);

  applyTextStyle(doc, TEXT_STYLE.disclaimer).text(
    text,
    LEFT + horizontalPadding,
    cursor.y + verticalPadding,
    {
      width: textWidth,
      lineGap: 2,
    },
  );

  cursor.y += boxHeight + 16;
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  title: string,
  options: {
    guide?: string;
    keepWithNextHeight?: number;
  } = {},
): void {
  const keepWithNextHeight = options.keepWithNextHeight ?? 0;

  ensureSpace(doc, cursor, SECTION_TITLE_HEIGHT + keepWithNextHeight);

  applyTextStyle(doc, TEXT_STYLE.sectionTitle).text(title, LEFT, cursor.y);

  if (options.guide !== undefined) {
    const titleWidth = doc.widthOfString(title);
    const guideX = LEFT + titleWidth + 12;

    applyTextStyle(doc, TEXT_STYLE.guide).text(
      options.guide,
      guideX,
      cursor.y + 3,
      {
        width: PAGE_WIDTH - RIGHT - guideX,
        lineBreak: false,
      },
    );
  }

  cursor.y += SECTION_TITLE_HEIGHT;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

// 섹션 1
function drawSummaryCards(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  const cardWidth = (CONTENT_WIDTH - SUMMARY_CARD_GAP * 2) / 3;
  const cards = [
    {
      label: '총 배변 횟수',
      value: `${data.summary.bowelCount}회`,
    },
    {
      label: '평균 간격',
      value: `${formatNumber(data.summary.intervalAvg)}일`,
    },
    {
      label: '기록 완성도',
      value: `${formatNumber(data.summary.completionScore)}%`,
    },
  ];

  ensureSpace(doc, cursor, SUMMARY_CARD_HEIGHT);

  cards.forEach((card, index) => {
    const x = LEFT + index * (cardWidth + SUMMARY_CARD_GAP);

    doc
      .roundedRect(x, cursor.y, cardWidth, SUMMARY_CARD_HEIGHT, 6)
      .fill(COLOR.beige5);

    applyTextStyle(doc, TEXT_STYLE.cardLabel).text(
      card.label,
      x + 12,
      cursor.y + 13,
      {
        width: cardWidth - 24,
        lineBreak: false,
      },
    );

    applyTextStyle(doc, TEXT_STYLE.cardValue).text(
      card.value,
      x + 12,
      cursor.y + 33,
      {
        width: cardWidth - 24,
        lineBreak: false,
      },
    );
  });

  cursor.y += SUMMARY_CARD_HEIGHT + 18;
}

// 섹션 2
function drawStoolBars(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  const fillByCode = {
    M: COLOR.orange6,
    H: COLOR.yellow4,
    T: COLOR.danger,
  } as const;

  for (const item of data.stoolDistribution) {
    ensureSpace(doc, cursor, BAR_ROW_HEIGHT);

    applyTextStyle(doc, TEXT_STYLE.barLabel).text(
      item.label,
      BAR_LABEL_X,
      cursor.y,
      {
        width: BAR_LABEL_WIDTH,
        lineBreak: false,
      },
    );

    doc
      .roundedRect(BAR_X, cursor.y + 2, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2)
      .fill(COLOR.beige6);

    const fillWidth = Math.min(BAR_WIDTH, (BAR_WIDTH * item.ratio) / 100);

    if (fillWidth > 0) {
      doc
        .roundedRect(
          BAR_X,
          cursor.y + 2,
          Math.max(fillWidth, BAR_HEIGHT),
          BAR_HEIGHT,
          BAR_HEIGHT / 2,
        )
        .fill(fillByCode[item.code]);
    }

    applyTextStyle(doc, TEXT_STYLE.barValue).text(
      `${formatNumber(item.ratio)}% (${item.count}회)`,
      BAR_VALUE_X,
      cursor.y + 1,
      {
        width: BAR_VALUE_WIDTH,
        align: 'right',
        lineBreak: false,
      },
    );

    cursor.y += BAR_ROW_HEIGHT;
  }

  cursor.y += 18;
}
// 공통 표
function drawTable<T>(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  columns: TableColumn<T>[],
  rows: T[],
): void {
  const drawHeader = (): void => {
    doc
      .rect(LEFT, cursor.y, CONTENT_WIDTH, TABLE_HEADER_HEIGHT)
      .fill(COLOR.beige5);

    let x = LEFT;

    for (const column of columns) {
      applyTextStyle(doc, TEXT_STYLE.tableHeader).text(
        column.title,
        x + 8,
        cursor.y + 8,
        {
          width: column.width - 16,
          align: column.align ?? 'left',
          lineBreak: false,
        },
      );
      x += column.width;
    }

    cursor.y += TABLE_HEADER_HEIGHT;
  };

  ensureSpace(doc, cursor, TABLE_HEADER_HEIGHT + TABLE_MIN_ROW_HEIGHT);
  drawHeader();

  for (const row of rows) {
    const cells = columns.map((column) => {
      const value = column.value(row);
      const style = column.bodyStyle ?? TEXT_STYLE.tableBody;
      const height = measureTextHeight(doc, value, column.width - 16, style, 2);

      return {
        value,
        style,
        height,
      };
    });
    const rowHeight = Math.max(
      TABLE_MIN_ROW_HEIGHT,
      ...cells.map((cell) => cell.height + 12),
    );

    if (ensureSpace(doc, cursor, rowHeight)) {
      drawHeader();
    }

    let x = LEFT;

    cells.forEach((cell, index) => {
      const column = columns[index];

      applyTextStyle(doc, cell.style).text(cell.value, x + 8, cursor.y + 6, {
        width: column.width - 16,
        align: column.align ?? 'left',
        lineGap: 2,
      });
      x += column.width;
    });

    doc
      .moveTo(LEFT, cursor.y + rowHeight)
      .lineTo(PAGE_WIDTH - RIGHT, cursor.y + rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLOR.beige7)
      .stroke();

    cursor.y += rowHeight;
  }

  cursor.y += 18;
}

//섹션3
function drawDiscomfortTable(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  drawTable(
    doc,
    cursor,
    [
      {
        title: '증상',
        width: 175,
        value: (row) => row.label,
        bodyStyle: TEXT_STYLE.tableLead,
      },
      {
        title: '기록 횟수',
        width: 120,
        value: (row) => `${row.count}회`,
      },
      {
        title: '주로 동반된 변 상태',
        width: CONTENT_WIDTH - 295,
        value: (row) => row.dominantStool,
      },
    ],
    data.discomfortRows,
  );
}

// 섹션 4
function drawLifeFactorTable(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  drawTable(
    doc,
    cursor,
    [
      {
        title: '항목',
        width: 125,
        value: (row) => row.label,
        bodyStyle: TEXT_STYLE.tableLead,
      },
      {
        title: '부족/낮음',
        width: 125,
        value: (row) => `${row.lowCount}일`,
      },
      {
        title: '보통',
        width: 125,
        value: (row) => `${row.normalCount}일`,
      },
      {
        title: '충분/높음',
        width: CONTENT_WIDTH - 375,
        value: (row) => `${row.highCount}일`,
      },
    ],
    data.lifeFactorRows,
  );

  if (data.topFoodTags.length === 0) return;

  const tags = data.topFoodTags
    .map((item) => `${item.name} ${item.count}회`)
    .join(' · ');
  const text = `주요 식사 태그  ${tags}`;
  const textHeight = measureTextHeight(
    doc,
    text,
    CONTENT_WIDTH,
    TEXT_STYLE.guide,
  );

  ensureSpace(doc, cursor, textHeight);
  applyTextStyle(doc, TEXT_STYLE.guide).text(text, LEFT, cursor.y - 4, {
    width: CONTENT_WIDTH,
  });
  cursor.y += textHeight + 12;
}

//섹션5
function measurePatternCardLayout(
  doc: PDFKit.PDFDocument,
  title: string,
  description: string,
): PatternCardLayout {
  const titleWidth = 112;
  const descriptionWidth = CONTENT_WIDTH - titleWidth - 34;
  const titleHeight = measureTextHeight(
    doc,
    title,
    titleWidth,
    TEXT_STYLE.patternTitle,
  );
  const descriptionHeight = measureTextHeight(
    doc,
    description,
    descriptionWidth,
    TEXT_STYLE.patternBody,
    PATTERN_LINE_GAP,
  );
  const cardHeight = Math.max(
    34,
    Math.max(titleHeight, descriptionHeight) + 18,
  );

  return {
    titleWidth,
    descriptionWidth,
    titleHeight,
    descriptionHeight,
    cardHeight,
  };
}
function drawPatternCards(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  if (data.patternCards.length === 0) return;

  const firstPattern = data.patternCards[0];
  const firstCardLayout = measurePatternCardLayout(
    doc,
    firstPattern.title,
    firstPattern.description,
  );

  drawSectionTitle(doc, cursor, '5. 감지된 패턴', {
    keepWithNextHeight: firstCardLayout.cardHeight + 8,
  });

  for (const pattern of data.patternCards) {
    const layout = measurePatternCardLayout(
      doc,
      pattern.title,
      pattern.description,
    );

    ensureSpace(doc, cursor, layout.cardHeight + 8);

    doc
      .roundedRect(LEFT, cursor.y, CONTENT_WIDTH, layout.cardHeight, 6)
      .fill(COLOR.yellow1);

    const titleY = cursor.y + (layout.cardHeight - layout.titleHeight) / 2;
    const descriptionY =
      cursor.y + (layout.cardHeight - layout.descriptionHeight) / 2;

    applyTextStyle(doc, TEXT_STYLE.patternTitle).text(
      pattern.title,
      LEFT + 12,
      titleY,
      {
        width: layout.titleWidth,
      },
    );

    applyTextStyle(doc, TEXT_STYLE.patternBody).text(
      pattern.description,
      LEFT + layout.titleWidth + 20,
      descriptionY,
      {
        width: layout.descriptionWidth,
        lineGap: PATTERN_LINE_GAP,
      },
    );

    cursor.y += layout.cardHeight + 8;
  }

  cursor.y += 10;
}

// 섹션 6
function drawDailyTable(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  rows: MonthlyPdfDailyRow[],
): void {
  drawSectionTitle(doc, cursor, '6. 일별 상세 기록', {
    keepWithNextHeight: TABLE_HEADER_HEIGHT + TABLE_MIN_ROW_HEIGHT,
  });

  drawTable(
    doc,
    cursor,
    [
      {
        title: '날짜',
        width: 52,
        value: (row) => row.date,
        bodyStyle: TEXT_STYLE.tableLead,
      },
      {
        title: '배변',
        width: 58,
        value: (row) => row.bowel,
      },
      {
        title: '변 상태',
        width: 92,
        value: (row) => row.stoolState,
      },
      {
        title: '불편감',
        width: 137,
        value: (row) => row.discomfort,
      },
      {
        title: '주요 생활',
        width: CONTENT_WIDTH - 339,
        value: (row) => row.mainLife,
      },
    ],
    rows,
  );
}

//하단 Footer
function drawFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  const footerLineWidth = PAGE_WIDTH - FOOTER_LINE_HORIZONTAL_MARGIN * 2;

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const isLastPage = index === range.count - 1;
    const pageNumber = `${index + 1} / ${range.count}`;
    const pageNumberHeight = measureTextHeight(
      doc,
      pageNumber,
      footerLineWidth,
      TEXT_STYLE.footer,
      0,
    );
    const pageNumberY =
      PAGE_HEIGHT - FOOTER_PAGE_NUMBER_BOTTOM_MARGIN - pageNumberHeight;
    const footerLineY = pageNumberY - FOOTER_LINE_TO_PAGE_NUMBER_GAP;

    if (isLastPage) {
      doc
        .moveTo(FOOTER_LINE_HORIZONTAL_MARGIN, footerLineY)
        .lineTo(PAGE_WIDTH - FOOTER_LINE_HORIZONTAL_MARGIN, footerLineY)
        .lineWidth(0.5)
        .strokeColor(COLOR.gray6)
        .stroke();

      const footerNotice = '이 리포트는 의료 진단이 아닌 개인 기록 요약입니다';
      const footerNoticeWidth = PAGE_WIDTH - LEFT - FOOTER_NOTICE_RIGHT_MARGIN;
      const footerNoticeHeight = measureTextHeight(
        doc,
        footerNotice,
        footerNoticeWidth,
        TEXT_STYLE.footer,
        0,
      );
      const footerNoticeY =
        footerLineY - FOOTER_NOTICE_TO_LINE_GAP - footerNoticeHeight;

      applyTextStyle(doc, TEXT_STYLE.footer).text(
        footerNotice,
        LEFT,
        footerNoticeY,
        {
          width: footerNoticeWidth,
          align: 'right',
          lineBreak: false,
        },
      );
    }

    applyTextStyle(doc, TEXT_STYLE.footer).text(
      pageNumber,
      FOOTER_LINE_HORIZONTAL_MARGIN,
      pageNumberY,
      {
        width: footerLineWidth,
        align: 'right',
        lineBreak: false,
      },
    );
  }
}

export async function renderMonthlyPdf(
  data: MonthlyPdfReportData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: TOP, left: LEFT, right: RIGHT, bottom: 0 },
      bufferPages: true,
      info: {
        Title: `Boogle 월간 리포트 ${data.period.startDate.slice(0, 7)}`,
        Author: 'Boogle',
        Subject: '배변·생활 패턴 기록 리포트',
      },
    });
    const chunks: Buffer[] = [];
    const cursor: Cursor = { y: TOP };

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      registerFonts(doc);
      drawFirstPageHeader(doc, cursor, data);
      drawNotice(doc, cursor);

      // 제목 + 카드 3개
      drawSectionTitle(doc, cursor, '1. 기본 현황', {
        keepWithNextHeight: SUMMARY_CARD_HEIGHT,
      });
      drawSummaryCards(doc, cursor, data);

      // 제목 + 첫 막대
      drawSectionTitle(doc, cursor, '2. 변 상태 분포', {
        guide: '브리스톨 1~2형=딱딱, 3~4형=보통, 5~7형=묽음 기준',
        keepWithNextHeight: BAR_ROW_HEIGHT,
      });
      drawStoolBars(doc, cursor, data);

      // 제목 + 표 헤더 + 첫 행
      drawSectionTitle(doc, cursor, '3. 불편감 기록', {
        keepWithNextHeight: TABLE_HEADER_HEIGHT + TABLE_MIN_ROW_HEIGHT,
      });
      drawDiscomfortTable(doc, cursor, data);

      // 제목 + 표 헤더 + 첫 행
      drawSectionTitle(doc, cursor, '4. 생활 요인 현황', {
        keepWithNextHeight: TABLE_HEADER_HEIGHT + TABLE_MIN_ROW_HEIGHT,
      });
      drawLifeFactorTable(doc, cursor, data);

      drawPatternCards(doc, cursor, data);
      drawDailyTable(doc, cursor, data.dailyRows);

      drawFooters(doc);
      doc.end();
    } catch (error) {
      doc.removeAllListeners();
      reject(
        error instanceof Error
          ? error
          : new Error('PDF 렌더링 중 알 수 없는 오류가 발생했습니다.'),
      );
    }
  });
}
