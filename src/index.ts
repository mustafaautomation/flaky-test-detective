// Core
export { Analyzer } from './core/analyzer';
export { loadConfig, writeDefaultConfig } from './core/config';
export {
  ParsedTestResult,
  ParsedRunResult,
  FlakinessRecord,
  FlakinessReport,
  DetectedPattern,
  TrendPoint,
  DetectiveConfig,
  ReporterConfig,
  DEFAULT_CONFIG,
} from './core/types';

// Parsers
export { BaseParser, detectParser } from './parsers/base.parser';
export { PlaywrightParser } from './parsers/playwright.parser';
export { JUnitParser } from './parsers/junit.parser';

// Storage
export { BaseStorage, generateTestId } from './storage/base.storage';
export { SqliteStorage } from './storage/sqlite.storage';
export { JsonStorage } from './storage/json.storage';

// Detectors
export { BaseDetector } from './detectors/base.detector';
export { TimingDetector } from './detectors/timing.detector';
export { NetworkDetector } from './detectors/network.detector';
export { OrderingDetector } from './detectors/ordering.detector';

// Reporters
export { ConsoleReporter } from './reporters/console.reporter';
export { JsonReporter } from './reporters/json.reporter';
export { HtmlReporter } from './reporters/html.reporter';
export { GithubReporter } from './reporters/github.reporter';

// Utils
export { logger, setLogLevel, getLogLevel } from './utils/logger';
export { flakinessScore, mean, standardDeviation, coefficientOfVariation, median, percentile } from './utils/stats';
