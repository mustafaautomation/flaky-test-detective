import { describe, it, expect } from 'vitest';
import { GithubReporter } from '../../src/reporters/github.reporter';
import { FlakinessReport, FlakinessRecord } from '../../src/core/types';

const reporter = new GithubReporter();

function makeRecord(overrides: Partial<FlakinessRecord> = {}): FlakinessRecord {
  return {
    name: 'login test',
    suite: 'auth',
    totalRuns: 20,
    passCount: 14,
    failCount: 6,
    skipCount: 0,
    flakinessScore: 0.3,
    patterns: [],
    quarantined: false,
    firstSeen: '2026-01-01',
    lastSeen: '2026-04-06',
    avgDuration: 500,
    durationVariance: 0.2,
    ...overrides,
  };
}

function makeReport(overrides: Partial<FlakinessReport> = {}): FlakinessReport {
  return {
    timestamp: '2026-04-06T10:00:00Z',
    totalTests: 100,
    flakyTests: 5,
    quarantinedTests: 1,
    overallFlakinessRate: 0.05,
    records: [makeRecord()],
    ...overrides,
  };
}

describe('GithubReporter', () => {
  it('should generate markdown with header', () => {
    const md = reporter.report(makeReport());
    expect(md).toContain('## Flaky Test Detective Report');
    expect(md).toContain('Tests Tracked');
    expect(md).toContain('100');
  });

  it('should show green circle for low flakiness rate', () => {
    const md = reporter.report(makeReport({ overallFlakinessRate: 0.02 }));
    expect(md).toContain(':green_circle:');
  });

  it('should show yellow circle for moderate flakiness', () => {
    const md = reporter.report(makeReport({ overallFlakinessRate: 0.1 }));
    expect(md).toContain(':yellow_circle:');
  });

  it('should show red circle for high flakiness', () => {
    const md = reporter.report(makeReport({ overallFlakinessRate: 0.3 }));
    expect(md).toContain(':red_circle:');
  });

  it('should show "no flaky tests" when records empty', () => {
    const md = reporter.report(makeReport({ records: [] }));
    expect(md).toContain('No flaky tests detected');
  });

  it('should render flaky test table', () => {
    const md = reporter.report(makeReport());
    expect(md).toContain('| Test |');
    expect(md).toContain('login test');
    expect(md).toContain('14/6'); // pass/fail
  });

  it('should show quarantined status', () => {
    const md = reporter.report(makeReport({ records: [makeRecord({ quarantined: true })] }));
    expect(md).toContain('Quarantined');
    expect(md).toContain(':no_entry:');
  });

  it('should show active status for non-quarantined', () => {
    const md = reporter.report(makeReport({ records: [makeRecord({ quarantined: false })] }));
    expect(md).toContain('Active');
  });

  it('should show pattern types', () => {
    const md = reporter.report(
      makeReport({
        records: [makeRecord({ patterns: [{ type: 'timing', confidence: 0.8, details: 'd' }] })],
      }),
    );
    expect(md).toContain('`timing`');
  });

  it('should truncate at 20 records', () => {
    const records = Array.from({ length: 25 }, (_, i) => makeRecord({ name: `test-${i}` }));
    const md = reporter.report(makeReport({ records }));
    expect(md).toContain('5 more flaky tests');
  });

  it('should generate quarantine grep pattern', () => {
    const md = reporter.report(
      makeReport({
        records: [makeRecord({ name: 'flaky test (auth)', quarantined: true })],
      }),
    );
    expect(md).toContain('grep-invert');
    expect(md).toContain('flaky test');
  });

  it('should escape markdown special chars in test names', () => {
    const md = reporter.report(
      makeReport({
        records: [makeRecord({ name: 'test | with | pipes' })],
      }),
    );
    expect(md).toContain('test \\| with \\| pipes');
  });

  it('should include footer with repo link', () => {
    const md = reporter.report(makeReport());
    expect(md).toContain('flaky-test-detective');
  });
});
