import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JUnitParser } from '../../src/parsers/junit.parser';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'junit-result.xml');

describe('JUnitParser', () => {
  const parser = new JUnitParser();

  it('should detect junit format', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    expect(parser.canParse(content)).toBe(true);
  });

  it('should not detect non-xml format', () => {
    expect(parser.canParse('{"suites": []}')).toBe(false);
    expect(parser.canParse('hello world')).toBe(false);
  });

  it('should parse junit results', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    expect(result.framework).toBe('junit');
    expect(result.tests).toHaveLength(5);
  });

  it('should extract test statuses correctly', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const passed = result.tests.filter((t) => t.status === 'passed');
    const failed = result.tests.filter((t) => t.status === 'failed');

    expect(passed).toHaveLength(3);
    expect(failed).toHaveLength(2);
  });

  it('should capture failure messages', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const failedTest = result.tests.find((t) => t.name === 'testLogout');
    expect(failedTest?.error).toContain('Connection refused');
  });

  it('should convert duration from seconds to milliseconds', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const test = result.tests.find((t) => t.name === 'testLogin');
    expect(test?.duration).toBe(2100);
  });

  it('should use classname as suite', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const result = parser.parse(content);

    const test = result.tests.find((t) => t.name === 'testLogin');
    expect(test?.suite).toBe('com.app.AuthTest');
  });
});
