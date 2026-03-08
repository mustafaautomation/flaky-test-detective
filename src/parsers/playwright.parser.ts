import { BaseParser } from './base.parser';
import { ParsedRunResult, ParsedTestResult } from '../core/types';

interface PlaywrightSpec {
  title: string;
  tests: PlaywrightTest[];
  suites?: PlaywrightSpec[];
}

interface PlaywrightTest {
  title: string;
  status: string;
  duration: number;
  results: Array<{
    status: string;
    duration: number;
    error?: { message?: string };
    retry?: number;
  }>;
}

interface PlaywrightReport {
  config?: { rootDir?: string };
  suites: PlaywrightSpec[];
  stats?: {
    startTime: string;
    duration: number;
  };
}

export class PlaywrightParser extends BaseParser {
  name = 'playwright';

  canParse(content: string): boolean {
    try {
      const data = JSON.parse(content);
      return (
        Array.isArray(data.suites) &&
        (data.config !== undefined || data.stats !== undefined)
      );
    } catch {
      return false;
    }
  }

  parse(content: string): ParsedRunResult {
    const data: PlaywrightReport = JSON.parse(content);
    const tests: ParsedTestResult[] = [];
    let position = 0;

    const extractTests = (spec: PlaywrightSpec, suitePath: string): void => {
      const currentSuite = suitePath ? `${suitePath} > ${spec.title}` : spec.title;

      for (const test of spec.tests || []) {
        const lastResult = test.results[test.results.length - 1];
        const status = this.mapStatus(test.status || lastResult?.status);
        const error = lastResult?.error?.message;
        const retries = test.results.length > 1 ? test.results.length - 1 : 0;

        tests.push({
          name: test.title,
          suite: currentSuite,
          status,
          duration: test.duration || lastResult?.duration || 0,
          error,
          retries,
          position: position++,
        });
      }

      for (const child of spec.suites || []) {
        extractTests(child, currentSuite);
      }
    };

    for (const suite of data.suites) {
      extractTests(suite, '');
    }

    return {
      framework: 'playwright',
      timestamp: data.stats?.startTime || new Date().toISOString(),
      duration: data.stats?.duration || 0,
      tests,
    };
  }

  private mapStatus(status: string): 'passed' | 'failed' | 'skipped' {
    switch (status) {
      case 'passed':
      case 'expected':
        return 'passed';
      case 'failed':
      case 'unexpected':
      case 'timedOut':
        return 'failed';
      case 'skipped':
      case 'fixme':
        return 'skipped';
      default:
        return 'failed';
    }
  }
}
