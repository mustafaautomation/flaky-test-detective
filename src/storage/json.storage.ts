import * as fs from 'fs';
import * as path from 'path';
import { BaseStorage, generateTestId } from './base.storage';
import { ParsedRunResult, FlakinessRecord, TrendPoint } from '../core/types';
import { logger } from '../utils/logger';
import { flakinessScore } from '../utils/stats';

interface JsonStoreData {
  records: Record<string, FlakinessRecord>;
  runs: Array<{
    timestamp: string;
    framework: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  }>;
}

export class JsonStorage extends BaseStorage {
  private filePath: string;
  private data: JsonStoreData = { records: {}, runs: [] };

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  init(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.data = JSON.parse(raw);
      logger.debug(`JSON storage loaded from ${this.filePath}`);
    } else {
      this.data = { records: {}, runs: [] };
      logger.debug(`JSON storage initialized at ${this.filePath}`);
    }
  }

  storeRun(run: ParsedRunResult): void {
    const passed = run.tests.filter((t) => t.status === 'passed').length;
    const failed = run.tests.filter((t) => t.status === 'failed').length;
    const skipped = run.tests.filter((t) => t.status === 'skipped').length;

    this.data.runs.push({
      timestamp: run.timestamp,
      framework: run.framework,
      totalTests: run.tests.length,
      passed,
      failed,
      skipped,
      duration: run.duration,
    });

    for (const test of run.tests) {
      const testId = generateTestId(test.name, test.suite);
      const existing = this.data.records[testId];

      if (existing) {
        if (test.status === 'passed') existing.passCount++;
        else if (test.status === 'failed') existing.failCount++;
        else existing.skipCount++;

        existing.totalRuns++;
        existing.lastSeen = run.timestamp;
        existing.durations = [...existing.durations, test.duration].slice(-50);
        if (test.error) {
          existing.errors = [...existing.errors, test.error].slice(-20);
        }
        if (test.position !== undefined) {
          existing.positions = [...existing.positions, test.position].slice(-50);
        }
        existing.flakinessScore = flakinessScore(
          existing.passCount,
          existing.failCount,
          existing.skipCount,
        );
      } else {
        this.data.records[testId] = {
          testId,
          name: test.name,
          suite: test.suite,
          passCount: test.status === 'passed' ? 1 : 0,
          failCount: test.status === 'failed' ? 1 : 0,
          skipCount: test.status === 'skipped' ? 1 : 0,
          totalRuns: 1,
          flakinessScore: 0,
          firstSeen: run.timestamp,
          lastSeen: run.timestamp,
          durations: [test.duration],
          errors: test.error ? [test.error] : [],
          positions: test.position !== undefined ? [test.position] : [],
          patterns: [],
          quarantined: false,
        };
      }
    }

    this.save();
  }

  getRecord(testId: string): FlakinessRecord | null {
    return this.data.records[testId] || null;
  }

  getAllRecords(): FlakinessRecord[] {
    return Object.values(this.data.records).sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  updateRecord(record: FlakinessRecord): void {
    this.data.records[record.testId] = record;
    // save() is called in close() — no per-record disk write
  }

  getTrends(days: number): TrendPoint[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const byDate = new Map<string, { flakyCount: number; totalTests: number }>();

    for (const run of this.data.runs) {
      if (run.timestamp < cutoffStr) continue;
      const date = run.timestamp.substring(0, 10);
      const existing = byDate.get(date) || { flakyCount: 0, totalTests: 0 };
      existing.flakyCount += run.failed;
      existing.totalTests += run.totalTests;
      byDate.set(date, existing);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        flakyCount: data.flakyCount,
        totalTests: data.totalTests,
        flakinessRate: data.totalTests > 0 ? data.flakyCount / data.totalTests : 0,
      }));
  }

  close(): void {
    this.save();
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }
}
