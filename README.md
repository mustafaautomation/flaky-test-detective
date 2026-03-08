# Flaky Test Detective

[![CI](https://github.com/mustafaautomation/flaky-test-detective/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaautomation/flaky-test-detective/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](Dockerfile)

Detect, track, and quarantine flaky tests with pattern analysis and trend reporting.

QA teams lose 6-8 hours per week on flaky tests. Flaky Test Detective analyzes your test results across multiple runs to identify which tests are flaky, why they're flaky, and automatically quarantines the worst offenders.

## Features

- **Multi-framework support** — Playwright JSON and JUnit XML parsers with auto-detection
- **Flakiness scoring** — `1 - (max(passCount, failCount) / totalRuns)` across historical runs
- **Pattern detection** — Timing variance, network errors, and order-dependent failures
- **Quarantine mode** — Auto-tag tests exceeding threshold, output as `--grep-invert` pattern
- **Trend tracking** — SQLite-backed historical data with trend analysis
- **Multiple reporters** — Console (colorized), JSON, HTML (dark dashboard with SVG charts), GitHub (PR comment markdown)

## Quick Start

```bash
npm install flaky-test-detective

# Initialize config
npx flaky-detective init

# Analyze test results
npx flaky-detective analyze ./test-results/results.json

# Analyze multiple runs for better detection
npx flaky-detective analyze ./results/run-*.json

# Generate HTML report
npx flaky-detective analyze ./results/*.json --reporter html,console

# Get quarantine pattern
npx flaky-detective quarantine
```

## CLI Commands

### `analyze <files...>`

Ingest test result files and compute flakiness.

```bash
npx flaky-detective analyze results.json [results2.json...] [options]

Options:
  -c, --config <path>     Path to config file
  -r, --reporter <type>   console, json, html, github (comma-separated)
  -o, --output <dir>      Output directory (default: .flaky-detective/reports)
  -v, --verbose           Enable debug logging
```

### `report`

Generate report from previously stored data.

### `quarantine`

Output grep pattern for quarantined tests. Use with Playwright:

```bash
npx playwright test --grep-invert "$(npx flaky-detective quarantine)"
```

### `trends`

Show flakiness trends over time.

### `init`

Create a default configuration file.

## Configuration

```json
{
  "storage": {
    "type": "sqlite",
    "path": ".flaky-detective/data.db"
  },
  "thresholds": {
    "flakiness": 0.1,
    "quarantine": 0.3,
    "minRuns": 3,
    "timingCv": 0.5
  },
  "parsers": ["auto"],
  "reporters": [{ "type": "console" }],
  "outputDir": ".flaky-detective/reports"
}
```

### Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| `flakiness` | 0.1 | Minimum score to flag as flaky |
| `quarantine` | 0.3 | Score threshold for auto-quarantine |
| `minRuns` | 3 | Minimum runs before analysis |
| `timingCv` | 0.5 | Coefficient of variation for timing detection |

## How It Works

### Flakiness Score

```
score = 1 - (max(passCount, failCount) / totalRuns)
```

- Score of 0 = perfectly stable (all pass or all fail)
- Score of 0.5 = maximum flakiness (equal pass/fail)

### Pattern Detection

| Pattern | Detection Method |
|---------|-----------------|
| **Timing** | High coefficient of variation in test durations |
| **Network** | Error messages matching network keywords (ECONNREFUSED, ETIMEDOUT, etc.) |
| **Ordering** | Position variance across runs suggesting order dependency |

### Storage

- **SQLite** (default) — Persistent storage with efficient trend queries
- **JSON** — File-based fallback, no native dependencies

## CI Integration

### GitHub Actions

```yaml
- name: Run tests
  run: npx playwright test --reporter=json --output-file=results.json
  continue-on-error: true

- name: Analyze flakiness
  run: npx flaky-detective analyze results.json --reporter github
```

## Programmatic Usage

```typescript
import { Analyzer, DEFAULT_CONFIG } from 'flaky-test-detective';

const analyzer = new Analyzer({
  ...DEFAULT_CONFIG,
  storage: { type: 'json', path: './flaky-data.json' },
});

analyzer.init();
const report = analyzer.analyze(['./results/run1.json', './results/run2.json']);

console.log(`Flaky tests: ${report.flakyTests}`);
console.log(`Quarantined: ${report.quarantinedTests}`);

analyzer.close();
```

## License

MIT

---

Built by [Quvantic](https://quvantic.com)
