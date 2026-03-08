import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JsonReporter } from '../../src/reporters/json.reporter';
import { HtmlReporter } from '../../src/reporters/html.reporter';
import { GithubReporter } from '../../src/reporters/github.reporter';
import { FlakinessReport } from '../../src/core/types';

const TMP_DIR = path.join(__dirname, '.tmp-reporters');

function makeSampleReport(): FlakinessReport {
  return {
    timestamp: '2025-01-15T10:00:00.000Z',
    totalTests: 10,
    flakyTests: 2,
    quarantinedTests: 1,
    overallFlakinessRate: 0.2,
    records: [
      {
        testId: 'suite::flaky-test',
        name: 'flaky-test',
        suite: 'suite',
        passCount: 5,
        failCount: 3,
        skipCount: 0,
        totalRuns: 8,
        flakinessScore: 0.375,
        firstSeen: '2025-01-10T10:00:00.000Z',
        lastSeen: '2025-01-15T10:00:00.000Z',
        durations: [100, 200, 5000, 150, 4500],
        errors: ['ETIMEDOUT: connection timed out'],
        positions: [0, 3, 1, 5, 2],
        patterns: [
          { type: 'timing', confidence: 0.8, description: 'High variance', evidence: ['CV: 120%'] },
          { type: 'network', confidence: 0.6, description: 'Network errors', evidence: ['ETIMEDOUT'] },
        ],
        quarantined: true,
      },
      {
        testId: 'suite::mild-flaky',
        name: 'mild-flaky',
        suite: 'suite',
        passCount: 8,
        failCount: 2,
        skipCount: 0,
        totalRuns: 10,
        flakinessScore: 0.2,
        firstSeen: '2025-01-10T10:00:00.000Z',
        lastSeen: '2025-01-15T10:00:00.000Z',
        durations: [100, 120, 110, 130],
        errors: ['Expected element to be visible'],
        positions: [1, 1, 1, 1],
        patterns: [],
        quarantined: false,
      },
    ],
    trends: [
      { date: '2025-01-14', flakyCount: 1, totalTests: 10, flakinessRate: 0.1 },
      { date: '2025-01-15', flakyCount: 2, totalTests: 10, flakinessRate: 0.2 },
    ],
  };
}

describe('JsonReporter', () => {
  afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
  });

  it('should write JSON report', () => {
    const outputPath = path.join(TMP_DIR, 'report.json');
    const reporter = new JsonReporter(outputPath);
    reporter.report(makeSampleReport());

    expect(fs.existsSync(outputPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(data.totalTests).toBe(10);
    expect(data.records).toHaveLength(2);
  });
});

describe('HtmlReporter', () => {
  afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
  });

  it('should write HTML report', () => {
    const outputPath = path.join(TMP_DIR, 'report.html');
    const reporter = new HtmlReporter(outputPath);
    reporter.report(makeSampleReport());

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Flaky Test Detective');
    expect(content).toContain('flaky-test');
    expect(content).toContain('QUARANTINED');
  });
});

describe('GithubReporter', () => {
  it('should generate markdown report', () => {
    const reporter = new GithubReporter();
    const md = reporter.report(makeSampleReport());

    expect(md).toContain('## Flaky Test Detective Report');
    expect(md).toContain('flaky-test');
    expect(md).toContain('Quarantined');
    expect(md).toContain('grep-invert');
  });

  it('should handle empty results', () => {
    const reporter = new GithubReporter();
    const md = reporter.report({
      ...makeSampleReport(),
      records: [],
      flakyTests: 0,
    });

    expect(md).toContain('No flaky tests detected');
  });
});
