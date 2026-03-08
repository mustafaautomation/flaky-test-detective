import { ParsedRunResult, FlakinessRecord, TrendPoint } from '../core/types';

export abstract class BaseStorage {
  abstract init(): void;
  abstract storeRun(run: ParsedRunResult): void;
  abstract getRecord(testId: string): FlakinessRecord | null;
  abstract getAllRecords(): FlakinessRecord[];
  abstract updateRecord(record: FlakinessRecord): void;
  abstract getTrends(days: number): TrendPoint[];
  abstract close(): void;

  initAsync?(): Promise<void>;
}

export function generateTestId(name: string, suite: string): string {
  return `${suite}::${name}`;
}
