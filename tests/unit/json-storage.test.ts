import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JsonStorage } from '../../src/storage/json.storage';
import { ParsedRunResult } from '../../src/core/types';

const TEST_DIR = path.join(__dirname, '.tmp-json-storage');
const TEST_PATH = path.join(TEST_DIR, 'test-data.json');

function makeSampleRun(): ParsedRunResult {
  return {
    framework: 'playwright',
    timestamp: '2025-01-15T10:00:00.000Z',
    duration: 5000,
    tests: [
      { name: 'test-a', suite: 'suite-1', status: 'passed', duration: 100, position: 0 },
      {
        name: 'test-b',
        suite: 'suite-1',
        status: 'failed',
        duration: 200,
        error: 'assertion failed',
        position: 1,
      },
      { name: 'test-c', suite: 'suite-2', status: 'passed', duration: 150, position: 2 },
    ],
  };
}

describe('JsonStorage', () => {
  let storage: JsonStorage;

  beforeEach(() => {
    storage = new JsonStorage(TEST_PATH);
    storage.init();
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should initialize and create file on first store', () => {
    storage.storeRun(makeSampleRun());
    expect(fs.existsSync(TEST_PATH)).toBe(true);
  });

  it('should store a run and create records', () => {
    storage.storeRun(makeSampleRun());

    const records = storage.getAllRecords();
    expect(records).toHaveLength(3);
  });

  it('should get a specific record', () => {
    storage.storeRun(makeSampleRun());

    const record = storage.getRecord('suite-1::test-a');
    expect(record).not.toBeNull();
    expect(record?.name).toBe('test-a');
    expect(record?.passCount).toBe(1);
    expect(record?.failCount).toBe(0);
  });

  it('should accumulate runs for the same test', () => {
    storage.storeRun(makeSampleRun());
    storage.storeRun(makeSampleRun());

    const record = storage.getRecord('suite-1::test-b');
    expect(record?.totalRuns).toBe(2);
    expect(record?.failCount).toBe(2);
    expect(record?.flakinessScore).toBe(0);
  });

  it('should track mixed results as flaky', () => {
    const run1 = makeSampleRun();
    const run2 = makeSampleRun();
    run2.tests[1].status = 'passed';

    storage.storeRun(run1);
    storage.storeRun(run2);

    const record = storage.getRecord('suite-1::test-b');
    expect(record?.passCount).toBe(1);
    expect(record?.failCount).toBe(1);
    expect(record?.flakinessScore).toBe(0.5);
  });

  it('should update records', () => {
    storage.storeRun(makeSampleRun());

    const record = storage.getRecord('suite-1::test-a')!;
    record.quarantined = true;
    storage.updateRecord(record);

    const updated = storage.getRecord('suite-1::test-a');
    expect(updated?.quarantined).toBe(true);
  });

  it('should sort records by flakiness score', () => {
    const run1 = makeSampleRun();
    storage.storeRun(run1);

    const run2 = {
      ...run1,
      tests: run1.tests.map((t) => ({
        ...t,
        status: t.status === 'passed' ? ('failed' as const) : ('passed' as const),
      })),
    };
    storage.storeRun(run2);

    const records = storage.getAllRecords();
    for (let i = 1; i < records.length; i++) {
      expect(records[i - 1].flakinessScore).toBeGreaterThanOrEqual(records[i].flakinessScore);
    }
  });
});
