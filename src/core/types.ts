// --- Parsed test results (from any framework) ---

export interface ParsedTestResult {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  retries?: number;
  position?: number;
}

export interface ParsedRunResult {
  framework: 'playwright' | 'junit' | 'unknown';
  timestamp: string;
  duration: number;
  tests: ParsedTestResult[];
  metadata?: Record<string, unknown>;
}

// --- Flakiness tracking ---

export interface FlakinessRecord {
  testId: string;
  name: string;
  suite: string;
  passCount: number;
  failCount: number;
  skipCount: number;
  totalRuns: number;
  flakinessScore: number;
  lastSeen: string;
  firstSeen: string;
  durations: number[];
  errors: string[];
  positions: number[];
  patterns: DetectedPattern[];
  quarantined: boolean;
}

export interface DetectedPattern {
  type: 'timing' | 'network' | 'ordering' | 'unknown';
  confidence: number;
  description: string;
  evidence: string[];
}

// --- Report output ---

export interface FlakinessReport {
  timestamp: string;
  totalTests: number;
  flakyTests: number;
  quarantinedTests: number;
  overallFlakinessRate: number;
  records: FlakinessRecord[];
  trends: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  flakyCount: number;
  totalTests: number;
  flakinessRate: number;
}

// --- Configuration ---

export interface DetectiveConfig {
  storage: {
    type: 'sqlite' | 'json';
    path: string;
  };
  thresholds: {
    flakiness: number;
    quarantine: number;
    minRuns: number;
    timingCv: number;
  };
  parsers: ('playwright' | 'junit' | 'auto')[];
  reporters: ReporterConfig[];
  outputDir: string;
}

export interface ReporterConfig {
  type: 'console' | 'json' | 'html' | 'github';
  outputPath?: string;
}

export const DEFAULT_CONFIG: DetectiveConfig = {
  storage: {
    type: 'sqlite',
    path: '.flaky-detective/data.db',
  },
  thresholds: {
    flakiness: 0.1,
    quarantine: 0.3,
    minRuns: 3,
    timingCv: 0.5,
  },
  parsers: ['auto'],
  reporters: [{ type: 'console' }],
  outputDir: '.flaky-detective/reports',
};
