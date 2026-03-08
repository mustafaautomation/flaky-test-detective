import { describe, it, expect } from 'vitest';
import { TimingDetector } from '../../src/detectors/timing.detector';
import { NetworkDetector } from '../../src/detectors/network.detector';
import { OrderingDetector } from '../../src/detectors/ordering.detector';
import { FlakinessRecord, DEFAULT_CONFIG } from '../../src/core/types';

function makeRecord(overrides: Partial<FlakinessRecord> = {}): FlakinessRecord {
  return {
    testId: 'suite::test',
    name: 'test',
    suite: 'suite',
    passCount: 5,
    failCount: 3,
    skipCount: 0,
    totalRuns: 8,
    flakinessScore: 0.375,
    lastSeen: '2025-01-15T10:00:00.000Z',
    firstSeen: '2025-01-10T10:00:00.000Z',
    durations: [100, 200, 150, 180, 120, 190, 160, 140],
    errors: [],
    positions: [0, 1, 2, 3, 4, 5, 6, 7],
    patterns: [],
    quarantined: false,
    ...overrides,
  };
}

describe('TimingDetector', () => {
  const detector = new TimingDetector();

  it('should detect high duration variance', () => {
    const record = makeRecord({
      durations: [100, 5000, 150, 4800, 200, 4500, 120, 5200],
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).not.toBeNull();
    expect(pattern?.type).toBe('timing');
    expect(pattern?.confidence).toBeGreaterThan(0);
  });

  it('should not detect low duration variance', () => {
    const record = makeRecord({
      durations: [100, 105, 98, 102, 101, 99, 103, 97],
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).toBeNull();
  });

  it('should require minimum runs', () => {
    const record = makeRecord({
      totalRuns: 1,
      durations: [100, 5000],
    });

    const config = { ...DEFAULT_CONFIG, thresholds: { ...DEFAULT_CONFIG.thresholds, minRuns: 5 } };
    const pattern = detector.detect(record, config);
    expect(pattern).toBeNull();
  });
});

describe('NetworkDetector', () => {
  const detector = new NetworkDetector();

  it('should detect network-related errors', () => {
    const record = makeRecord({
      errors: ['ECONNREFUSED: connect failed', 'ETIMEDOUT: request timed out', 'normal assertion error'],
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).not.toBeNull();
    expect(pattern?.type).toBe('network');
  });

  it('should not detect non-network errors', () => {
    const record = makeRecord({
      errors: ['Expected true to be false', 'Element not found: .button'],
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).toBeNull();
  });

  it('should return null when no errors', () => {
    const record = makeRecord({ errors: [] });
    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).toBeNull();
  });
});

describe('OrderingDetector', () => {
  const detector = new OrderingDetector();

  it('should detect position variation', () => {
    const record = makeRecord({
      positions: [0, 5, 1, 8, 2, 7, 0, 9],
      flakinessScore: 0.4,
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).not.toBeNull();
    expect(pattern?.type).toBe('ordering');
  });

  it('should not detect consistent positioning', () => {
    const record = makeRecord({
      positions: [3, 3, 3, 3, 3, 3, 3, 3],
      flakinessScore: 0.3,
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).toBeNull();
  });

  it('should not detect if not flaky', () => {
    const record = makeRecord({
      positions: [0, 5, 1, 8, 2, 7, 0, 9],
      flakinessScore: 0,
    });

    const pattern = detector.detect(record, DEFAULT_CONFIG);
    expect(pattern).toBeNull();
  });
});
