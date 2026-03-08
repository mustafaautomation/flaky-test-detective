import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PlaywrightParser } from '../../src/parsers/playwright.parser';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'playwright-result.json');

describe('PlaywrightParser', () => {
  const parser = new PlaywrightParser();

  it('should detect playwright format', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    expect(parser.canParse(content)).toBe(true);
  });

  it('should not detect non-playwright format', () => {
    expect(parser.canParse('{"foo": "bar"}')).toBe(false);
    expect(parser.canParse('<xml/>')).toBe(false);
    expect(parser.canParse('not json')).toBe(false);
  });

  it('should parse playwright results', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    expect(result.framework).toBe('playwright');
    expect(result.tests).toHaveLength(5);
    expect(result.timestamp).toBe('2025-01-15T10:00:00.000Z');
  });

  it('should extract test statuses correctly', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const passed = result.tests.filter((t) => t.status === 'passed');
    const failed = result.tests.filter((t) => t.status === 'failed');
    const skipped = result.tests.filter((t) => t.status === 'skipped');

    expect(passed).toHaveLength(3);
    expect(failed).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });

  it('should capture error messages', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const failedTest = result.tests.find((t) => t.status === 'failed');
    expect(failedTest?.error).toContain('ETIMEDOUT');
  });

  it('should detect retries', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const retriedTest = result.tests.find(
      (t) => t.name === 'should show error for invalid password',
    );
    expect(retriedTest?.retries).toBe(1);
  });

  it('should assign position indices', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const positions = result.tests.map((t) => t.position);
    expect(positions).toEqual([0, 1, 2, 3, 4]);
  });

  it('should build nested suite paths', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const loginTest = result.tests.find((t) => t.name === 'should login with valid credentials');
    expect(loginTest?.suite).toBe('auth.spec.ts > Login');
  });
});
