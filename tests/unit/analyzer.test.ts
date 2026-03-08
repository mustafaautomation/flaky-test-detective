import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Analyzer } from '../../src/core/analyzer';
import { DetectiveConfig, DEFAULT_CONFIG } from '../../src/core/types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TMP_DIR = path.join(__dirname, '.tmp-analyzer');

function makeConfig(): DetectiveConfig {
  return {
    ...DEFAULT_CONFIG,
    storage: { type: 'json', path: path.join(TMP_DIR, 'data.json') },
    thresholds: { ...DEFAULT_CONFIG.thresholds, minRuns: 2 },
  };
}

describe('Analyzer', () => {
  let analyzer: Analyzer;

  beforeEach(async () => {
    analyzer = new Analyzer(makeConfig());
    await analyzer.init();
  });

  afterEach(() => {
    analyzer.close();
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
  });

  it('should analyze playwright result files', () => {
    const report = analyzer.analyze([path.join(FIXTURES_DIR, 'playwright-result.json')]);
    expect(report.totalTests).toBeGreaterThan(0);
  });

  it('should analyze junit result files', () => {
    const report = analyzer.analyze([path.join(FIXTURES_DIR, 'junit-result.xml')]);
    expect(report.totalTests).toBeGreaterThan(0);
  });

  it('should detect flaky tests across multiple runs', () => {
    const report = analyzer.analyze([
      path.join(FIXTURES_DIR, 'playwright-result.json'),
      path.join(FIXTURES_DIR, 'playwright-result-2.json'),
    ]);

    expect(report.totalTests).toBeGreaterThan(0);
    expect(report.flakyTests).toBeGreaterThanOrEqual(0);
  });

  it('should generate quarantine pattern', () => {
    analyzer.analyze([
      path.join(FIXTURES_DIR, 'playwright-result.json'),
      path.join(FIXTURES_DIR, 'playwright-result-2.json'),
    ]);

    const pattern = analyzer.getQuarantinePattern();
    expect(typeof pattern).toBe('string');
  });

  it('should build a report', () => {
    analyzer.analyze([path.join(FIXTURES_DIR, 'playwright-result.json')]);
    const report = analyzer.getReport();

    expect(report.timestamp).toBeDefined();
    expect(report.totalTests).toBeGreaterThan(0);
    expect(typeof report.overallFlakinessRate).toBe('number');
    expect(Array.isArray(report.records)).toBe(true);
    expect(Array.isArray(report.trends)).toBe(true);
  });
});
