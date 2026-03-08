import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { BaseStorage, generateTestId } from './base.storage';
import { ParsedRunResult, FlakinessRecord, TrendPoint } from '../core/types';
import { logger } from '../utils/logger';
import { flakinessScore } from '../utils/stats';

export class SqliteStorage extends BaseStorage {
  private db!: SqlJsDatabase;
  private dbPath: string;

  constructor(dbPath: string) {
    super();
    this.dbPath = dbPath;
  }

  async initAsync(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_records (
        test_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        suite TEXT NOT NULL,
        pass_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        skip_count INTEGER DEFAULT 0,
        total_runs INTEGER DEFAULT 0,
        flakiness_score REAL DEFAULT 0,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        durations TEXT DEFAULT '[]',
        errors TEXT DEFAULT '[]',
        positions TEXT DEFAULT '[]',
        patterns TEXT DEFAULT '[]',
        quarantined INTEGER DEFAULT 0
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        framework TEXT NOT NULL,
        total_tests INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        failed INTEGER NOT NULL,
        skipped INTEGER NOT NULL,
        duration INTEGER NOT NULL
      )
    `);

    logger.debug(`SQLite storage initialized at ${this.dbPath}`);
  }

  init(): void {
    // Sync wrapper — call initAsync() for full async init
    // For sync usage, we initialize inline
  }

  storeRun(run: ParsedRunResult): void {
    const passed = run.tests.filter((t) => t.status === 'passed').length;
    const failed = run.tests.filter((t) => t.status === 'failed').length;
    const skipped = run.tests.filter((t) => t.status === 'skipped').length;

    this.db.run(
      `INSERT INTO runs (timestamp, framework, total_tests, passed, failed, skipped, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [run.timestamp, run.framework, run.tests.length, passed, failed, skipped, run.duration]
    );

    for (const test of run.tests) {
      const testId = generateTestId(test.name, test.suite);
      const passInc = test.status === 'passed' ? 1 : 0;
      const failInc = test.status === 'failed' ? 1 : 0;
      const skipInc = test.status === 'skipped' ? 1 : 0;

      const existing = this.getRecord(testId);

      if (existing) {
        const newPassCount = existing.passCount + passInc;
        const newFailCount = existing.failCount + failInc;
        const newSkipCount = existing.skipCount + skipInc;
        const newTotalRuns = existing.totalRuns + 1;
        const newScore = flakinessScore(newPassCount, newFailCount);
        const durations = [...existing.durations, test.duration].slice(-50);
        const errors = test.error
          ? [...existing.errors, test.error].slice(-20)
          : existing.errors;
        const positions =
          test.position !== undefined
            ? [...existing.positions, test.position].slice(-50)
            : existing.positions;

        this.db.run(
          `UPDATE test_records SET
            pass_count = ?, fail_count = ?, skip_count = ?, total_runs = ?,
            flakiness_score = ?, last_seen = ?, durations = ?, errors = ?, positions = ?
          WHERE test_id = ?`,
          [
            newPassCount, newFailCount, newSkipCount, newTotalRuns,
            newScore, run.timestamp,
            JSON.stringify(durations), JSON.stringify(errors), JSON.stringify(positions),
            testId,
          ]
        );
      } else {
        const score = flakinessScore(passInc, failInc);
        this.db.run(
          `INSERT INTO test_records (test_id, name, suite, pass_count, fail_count, skip_count, total_runs, flakiness_score, first_seen, last_seen, durations, errors, positions)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
          [
            testId, test.name, test.suite,
            passInc, failInc, skipInc,
            score, run.timestamp, run.timestamp,
            JSON.stringify([test.duration]),
            JSON.stringify(test.error ? [test.error] : []),
            JSON.stringify(test.position !== undefined ? [test.position] : []),
          ]
        );
      }
    }

    this.save();
  }

  getRecord(testId: string): FlakinessRecord | null {
    const stmt = this.db.prepare('SELECT * FROM test_records WHERE test_id = ?');
    stmt.bind([testId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToRecord(row);
    }

    stmt.free();
    return null;
  }

  getAllRecords(): FlakinessRecord[] {
    const results: FlakinessRecord[] = [];
    const stmt = this.db.prepare('SELECT * FROM test_records ORDER BY flakiness_score DESC');

    while (stmt.step()) {
      results.push(this.rowToRecord(stmt.getAsObject()));
    }

    stmt.free();
    return results;
  }

  updateRecord(record: FlakinessRecord): void {
    this.db.run(
      `UPDATE test_records SET
        pass_count = ?, fail_count = ?, skip_count = ?, total_runs = ?,
        flakiness_score = ?, last_seen = ?, durations = ?, errors = ?,
        positions = ?, patterns = ?, quarantined = ?
      WHERE test_id = ?`,
      [
        record.passCount, record.failCount, record.skipCount, record.totalRuns,
        record.flakinessScore, record.lastSeen,
        JSON.stringify(record.durations), JSON.stringify(record.errors),
        JSON.stringify(record.positions), JSON.stringify(record.patterns),
        record.quarantined ? 1 : 0,
        record.testId,
      ]
    );
    this.save();
  }

  getTrends(days: number): TrendPoint[] {
    const results: TrendPoint[] = [];
    const stmt = this.db.prepare(
      `SELECT
        substr(timestamp, 1, 10) as date,
        SUM(failed) as flaky_count,
        SUM(total_tests) as total_tests
      FROM runs
      WHERE timestamp >= date('now', '-' || ? || ' days')
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date`
    );
    stmt.bind([days]);

    while (stmt.step()) {
      const row = stmt.getAsObject() as { date: string; flaky_count: number; total_tests: number };
      results.push({
        date: row.date,
        flakyCount: row.flaky_count,
        totalTests: row.total_tests,
        flakinessRate: row.total_tests > 0 ? row.flaky_count / row.total_tests : 0,
      });
    }

    stmt.free();
    return results;
  }

  close(): void {
    this.save();
    this.db.close();
  }

  private save(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  private rowToRecord(row: Record<string, unknown>): FlakinessRecord {
    return {
      testId: String(row.test_id),
      name: String(row.name),
      suite: String(row.suite),
      passCount: Number(row.pass_count),
      failCount: Number(row.fail_count),
      skipCount: Number(row.skip_count),
      totalRuns: Number(row.total_runs),
      flakinessScore: Number(row.flakiness_score),
      firstSeen: String(row.first_seen),
      lastSeen: String(row.last_seen),
      durations: JSON.parse(String(row.durations)),
      errors: JSON.parse(String(row.errors)),
      positions: JSON.parse(String(row.positions)),
      patterns: JSON.parse(String(row.patterns)),
      quarantined: Number(row.quarantined) === 1,
    };
  }
}
