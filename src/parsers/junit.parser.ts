import { XMLParser } from 'fast-xml-parser';
import { BaseParser } from './base.parser';
import { ParsedRunResult, ParsedTestResult } from '../core/types';

interface JUnitTestCase {
  '@_name': string;
  '@_classname'?: string;
  '@_time'?: string;
  failure?: { '#text'?: string; '@_message'?: string } | string;
  error?: { '#text'?: string; '@_message'?: string } | string;
  skipped?: unknown;
}

interface JUnitTestSuite {
  '@_name': string;
  '@_time'?: string;
  '@_timestamp'?: string;
  '@_tests'?: string;
  testcase?: JUnitTestCase | JUnitTestCase[];
}

interface JUnitReport {
  testsuites?: {
    testsuite?: JUnitTestSuite | JUnitTestSuite[];
    '@_time'?: string;
  };
  testsuite?: JUnitTestSuite | JUnitTestSuite[];
}

export class JUnitParser extends BaseParser {
  name = 'junit';

  canParse(content: string): boolean {
    return (
      content.trimStart().startsWith('<?xml') ||
      content.includes('<testsuites') ||
      content.includes('<testsuite')
    );
  }

  parse(content: string): ParsedRunResult {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const data: JUnitReport = parser.parse(content);
    const tests: ParsedTestResult[] = [];
    let position = 0;
    let totalDuration = 0;
    let timestamp = new Date().toISOString();

    const suites = this.extractSuites(data);

    for (const suite of suites) {
      if (suite['@_timestamp']) {
        timestamp = suite['@_timestamp'];
      }

      const cases = this.toArray(suite.testcase);
      for (const tc of cases) {
        const duration = Math.round(parseFloat(tc['@_time'] || '0') * 1000);
        totalDuration += duration;

        let status: 'passed' | 'failed' | 'skipped' = 'passed';
        let error: string | undefined;

        if (tc.skipped !== undefined) {
          status = 'skipped';
        } else if (tc.failure !== undefined) {
          status = 'failed';
          error =
            typeof tc.failure === 'string'
              ? tc.failure
              : tc.failure['@_message'] || tc.failure['#text'];
        } else if (tc.error !== undefined) {
          status = 'failed';
          error =
            typeof tc.error === 'string' ? tc.error : tc.error['@_message'] || tc.error['#text'];
        }

        tests.push({
          name: tc['@_name'],
          suite: tc['@_classname'] || suite['@_name'],
          status,
          duration,
          error,
          position: position++,
        });
      }
    }

    return {
      framework: 'junit',
      timestamp,
      duration: totalDuration,
      tests,
    };
  }

  private extractSuites(data: JUnitReport): JUnitTestSuite[] {
    if (data.testsuites?.testsuite) {
      return this.toArray(data.testsuites.testsuite);
    }
    if (data.testsuite) {
      return this.toArray(data.testsuite);
    }
    return [];
  }

  private toArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
