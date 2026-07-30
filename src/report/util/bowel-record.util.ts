import type { BoogleRecordForReport } from '../dto/report-record.dto';

export type TimedBowelRecord = BoogleRecordForReport & {
  hasBowel: true;
  bowelMovementAt: Date;
};

export function hasBowelMovementAt(
  record: BoogleRecordForReport,
): record is TimedBowelRecord {
  const movementAt = record.bowelMovementAt;

  return (
    record.hasBowel &&
    movementAt instanceof Date &&
    !Number.isNaN(movementAt.getTime())
  );
}
