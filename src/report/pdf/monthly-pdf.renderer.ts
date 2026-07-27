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
const FOOTER_TOP = PAGE_HEIGHT - 44;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;

const COLOR = {
  orange: '#FF7650',
  orangeLight: '#FFF0E9',
  coral: '#FF6972',
  yellow: '#F5C96A',
  cream: '#FFF8EC',
  card: '#F8F6F4',
  tableHead: '#F7F5F3',
  line: '#E9E4E0',
  text: '#3F3A37',
  muted: '#77716D',
  white: '#FFFFFF',
} as const;

const FONT = {
  regular: 'Pretendard-Regular',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  black: 'Pretendard-Black',
} as const;

interface Cursor {
  y: number;
}

interface TableColumn<T> {
  title: string;
  width: number;
  value: (row: T) => string;
  align?: 'left' | 'center' | 'right';
}

function resolveAssetPath(...segments: string[]): string {
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

  return found;
}

function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(
    FONT.regular,
    resolveAssetPath('fonts', 'Pretendard-Regular.ttf'),
  );
  doc.registerFont(
    FONT.semiBold,
    resolveAssetPath('fonts', 'Pretendard-SemiBold.ttf'),
  );
  doc.registerFont(FONT.bold, resolveAssetPath('fonts', 'Pretendard-Bold.ttf'));
  doc.registerFont(
    FONT.black,
    resolveAssetPath('fonts', 'Pretendard-Black.ttf'),
  );
  doc.font(FONT.regular);
}

function addContentPage(doc: PDFKit.PDFDocument, cursor: Cursor): void {
  doc.addPage({
    size: 'A4',
    margins: { top: TOP, left: LEFT, right: RIGHT, bottom: 0 },
  });
  cursor.y = TOP;
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  requiredHeight: number,
): boolean {
  if (cursor.y + requiredHeight <= FOOTER_TOP - 12) {
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
  doc
    .font(FONT.regular)
    .fontSize(7)
    .fillColor(COLOR.muted)
    .text('배변·생활 패턴 기록 리포트', LEFT, 67);

  doc
    .font(FONT.semiBold)
    .fontSize(9)
    .fillColor(COLOR.text)
    .text(data.period.displayRange, 300, 43, {
      width: PAGE_WIDTH - RIGHT - 300,
      align: 'right',
    });
  doc
    .font(FONT.regular)
    .fontSize(6.5)
    .fillColor(COLOR.muted)
    .text(`생성일: ${data.period.displayGeneratedDate}`, 300, 61, {
      width: PAGE_WIDTH - RIGHT - 300,
      align: 'right',
    });

  doc
    .moveTo(LEFT, 82)
    .lineTo(PAGE_WIDTH - RIGHT, 82)
    .lineWidth(1.2)
    .strokeColor(COLOR.orange)
    .stroke();

  cursor.y = 92;
}

function drawNotice(doc: PDFKit.PDFDocument, cursor: Cursor): void {
  const text =
    '이 문서는 부글 서비스에 사용자가 직접 기록한 데이터를 바탕으로 생성된 생활 패턴 요약입니다.\n' +
    '의료 진단이나 질병 예측을 포함하지 않으며, 전문가 상담 시 참고 자료로 활용하실 수 있습니다.';

  doc.roundedRect(LEFT, cursor.y, CONTENT_WIDTH, 42, 6).fill(COLOR.cream);
  doc
    .font(FONT.regular)
    .fontSize(7)
    .fillColor(COLOR.text)
    .text(text, LEFT + 12, cursor.y + 10, {
      width: CONTENT_WIDTH - 24,
      lineGap: 3,
    });

  cursor.y += 54;
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  title: string,
  guide?: string,
): void {
  ensureSpace(doc, cursor, 28);

  doc
    .font(FONT.bold)
    .fontSize(10)
    .fillColor(COLOR.text)
    .text(title, LEFT, cursor.y);

  if (guide !== undefined) {
    doc
      .font(FONT.regular)
      .fontSize(5.7)
      .fillColor(COLOR.muted)
      .text(guide, LEFT + 100, cursor.y + 2, {
        width: CONTENT_WIDTH - 100,
      });
  }

  cursor.y += 22;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function drawSummaryCards(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
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

  cards.forEach((card, index) => {
    const x = LEFT + index * (cardWidth + gap);
    doc.roundedRect(x, cursor.y, cardWidth, 58, 6).fill(COLOR.card);
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLOR.muted)
      .text(card.label, x + 12, cursor.y + 12);
    doc
      .font(FONT.black)
      .fontSize(16)
      .fillColor(COLOR.orange)
      .text(card.value, x + 12, cursor.y + 29);
  });

  cursor.y += 74;
}

function drawStoolBars(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  const fillByCode = {
    M: COLOR.orange,
    H: COLOR.yellow,
    T: COLOR.coral,
  } as const;
  const barX = LEFT + 38;
  const barWidth = 338;

  for (const item of data.stoolDistribution) {
    ensureSpace(doc, cursor, 18);

    doc
      .font(FONT.semiBold)
      .fontSize(7)
      .fillColor(COLOR.text)
      .text(item.label, LEFT, cursor.y + 1, { width: 30 });
    doc.roundedRect(barX, cursor.y, barWidth, 10, 5).fill(COLOR.card);

    const fillWidth = Math.max(
      0,
      Math.min(barWidth, (barWidth * item.ratio) / 100),
    );
    if (fillWidth > 0) {
      doc
        .roundedRect(barX, cursor.y, Math.max(fillWidth, 10), 10, 5)
        .fill(fillByCode[item.code]);
    }

    doc
      .font(FONT.regular)
      .fontSize(6.5)
      .fillColor(COLOR.text)
      .text(
        `${formatNumber(item.ratio)}% (${item.count}회)`,
        barX + barWidth + 10,
        cursor.y + 1,
        { width: 88, align: 'right' },
      );

    cursor.y += 18;
  }

  cursor.y += 10;
}

function textHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  fontSize = 7,
): number {
  doc.font(FONT.regular).fontSize(fontSize);
  return doc.heightOfString(text, { width, lineGap: 1.5 });
}

function drawTable<T>(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  columns: TableColumn<T>[],
  rows: T[],
): void {
  const drawHeader = (): void => {
    doc.rect(LEFT, cursor.y, CONTENT_WIDTH, 25).fill(COLOR.tableHead);

    let x = LEFT;
    for (const column of columns) {
      doc
        .font(FONT.semiBold)
        .fontSize(6.5)
        .fillColor(COLOR.text)
        .text(column.title, x + 8, cursor.y + 9, {
          width: column.width - 16,
          align: column.align ?? 'left',
        });
      x += column.width;
    }

    cursor.y += 25;
  };

  ensureSpace(doc, cursor, 50);
  drawHeader();

  for (const row of rows) {
    const values = columns.map((column) => column.value(row));
    const contentHeight = Math.max(
      ...values.map((value, index) =>
        textHeight(doc, value, columns[index].width - 16),
      ),
    );
    const rowHeight = Math.max(24, contentHeight + 12);

    if (ensureSpace(doc, cursor, rowHeight)) {
      drawHeader();
    }

    let x = LEFT;
    values.forEach((value, index) => {
      const column = columns[index];
      doc
        .font(FONT.regular)
        .fontSize(7)
        .fillColor(COLOR.text)
        .text(value, x + 8, cursor.y + 7, {
          width: column.width - 16,
          align: column.align ?? 'left',
          lineGap: 1.5,
        });
      x += column.width;
    });

    doc
      .moveTo(LEFT, cursor.y + rowHeight)
      .lineTo(PAGE_WIDTH - RIGHT, cursor.y + rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLOR.line)
      .stroke();

    cursor.y += rowHeight;
  }

  cursor.y += 16;
}

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

  if (data.topFoodTags.length > 0) {
    const tags = data.topFoodTags
      .map((item) => `${item.name} ${item.count}회`)
      .join(' · ');
    doc
      .font(FONT.regular)
      .fontSize(6.5)
      .fillColor(COLOR.muted)
      .text(`주요 식사 태그  ${tags}`, LEFT, cursor.y - 5, {
        width: CONTENT_WIDTH,
      });
    cursor.y += 12;
  }
}

function drawPatternCards(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  data: MonthlyPdfReportData,
): void {
  if (data.patternCards.length === 0) return;

  drawSectionTitle(doc, cursor, '5. 감지된 패턴');

  for (const pattern of data.patternCards) {
    const titleWidth = 100;
    const descriptionWidth = CONTENT_WIDTH - titleWidth - 32;
    const descriptionHeight = textHeight(
      doc,
      pattern.description,
      descriptionWidth,
      6.5,
    );
    const cardHeight = Math.max(31, descriptionHeight + 17);

    ensureSpace(doc, cursor, cardHeight + 7);
    doc
      .roundedRect(LEFT, cursor.y, CONTENT_WIDTH, cardHeight, 6)
      .fill(COLOR.cream);
    doc
      .font(FONT.bold)
      .fontSize(7)
      .fillColor(COLOR.text)
      .text(pattern.title, LEFT + 12, cursor.y + 10, {
        width: titleWidth,
      });
    doc
      .font(FONT.regular)
      .fontSize(6.5)
      .fillColor(COLOR.text)
      .text(pattern.description, LEFT + titleWidth + 18, cursor.y + 10, {
        width: descriptionWidth,
        lineGap: 1.5,
      });

    cursor.y += cardHeight + 7;
  }

  cursor.y += 8;
}

function drawDailyTable(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  rows: MonthlyPdfDailyRow[],
): void {
  const sectionTitleHeight = 22;
  const tableHeaderHeight = 25;
  const minimumRowHeight = 24;

  ensureSpace(
    doc,
    cursor,
    sectionTitleHeight + tableHeaderHeight + minimumRowHeight,
  );
  drawSectionTitle(doc, cursor, '6. 일별 상세기록');

  drawTable(
    doc,
    cursor,
    [
      {
        title: '날짜',
        width: 52,
        value: (row) => row.date,
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
        title: '주요생활',
        width: CONTENT_WIDTH - 339,
        value: (row) => row.mainLife,
      },
    ],
    rows,
  );
}

function drawFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const isLastPage = index === range.count - 1;

    doc
      .moveTo(LEFT, FOOTER_TOP)
      .lineTo(PAGE_WIDTH - RIGHT, FOOTER_TOP)
      .lineWidth(0.5)
      .strokeColor(COLOR.line)
      .stroke();

    if (isLastPage) {
      doc
        .font(FONT.regular)
        .fontSize(5.5)
        .fillColor(COLOR.muted)
        .text(
          '이 리포트는 의료 진단이 아닌 개인 기록 요약입니다.',
          LEFT,
          FOOTER_TOP + 8,
          {
            width: CONTENT_WIDTH - 50,
            align: 'right',
            lineBreak: false,
          },
        );
    }

    doc
      .font(FONT.regular)
      .fontSize(5.5)
      .fillColor(COLOR.muted)
      .text(`${index + 1} / ${range.count}`, LEFT, FOOTER_TOP + 22, {
        width: CONTENT_WIDTH,
        align: 'right',
        lineBreak: false,
      });
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

      drawSectionTitle(doc, cursor, '1. 기본 현황');
      drawSummaryCards(doc, cursor, data);

      drawSectionTitle(
        doc,
        cursor,
        '2. 변 상태 분포',
        '브리스톨 1~2형=딱딱, 3~4형=보통, 5~7형=묽음 기준',
      );
      drawStoolBars(doc, cursor, data);

      drawSectionTitle(doc, cursor, '3. 불편감 기록');
      drawDiscomfortTable(doc, cursor, data);

      drawSectionTitle(
        doc,
        cursor,
        '4. 생활 요인 현황',
        '주요 식사 태그: 음주, 야식, 자극적, 기름진, 유제품',
      );
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
