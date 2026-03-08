import { FlakinessReport, FlakinessRecord, DetectedPattern } from '../core/types';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

export class ConsoleReporter {
  report(result: FlakinessReport): void {
    console.log();
    console.log(`${BOLD}${CYAN}Flaky Test Detective Report${RESET}`);
    console.log(`${DIM}${result.timestamp}${RESET}`);
    console.log();

    this.printSummary(result);

    if (result.records.length === 0) {
      console.log(`${GREEN}No flaky tests detected!${RESET}`);
      return;
    }

    console.log(`${BOLD}Flaky Tests:${RESET}`);
    console.log();

    const header = this.padColumns(['Test', 'Suite', 'Score', 'Runs', 'P/F', 'Patterns', 'Status']);
    console.log(`${DIM}${header}${RESET}`);
    console.log(`${DIM}${'─'.repeat(120)}${RESET}`);

    for (const record of result.records) {
      this.printRecord(record);
    }

    console.log();
    this.printQuarantined(result);
  }

  private printSummary(result: FlakinessReport): void {
    const rateColor = result.overallFlakinessRate > 0.2 ? RED : result.overallFlakinessRate > 0.05 ? YELLOW : GREEN;

    console.log(`  Total Tests Tracked:  ${WHITE}${result.totalTests}${RESET}`);
    console.log(`  Flaky Tests:          ${YELLOW}${result.flakyTests}${RESET}`);
    console.log(`  Quarantined:          ${RED}${result.quarantinedTests}${RESET}`);
    console.log(`  Flakiness Rate:       ${rateColor}${(result.overallFlakinessRate * 100).toFixed(1)}%${RESET}`);
    console.log();
  }

  private printRecord(record: FlakinessRecord): void {
    const scoreColor = record.flakinessScore >= 0.3 ? RED : record.flakinessScore >= 0.1 ? YELLOW : GREEN;
    const statusIcon = record.quarantined ? `${RED}QUARANTINED${RESET}` : `${GREEN}ACTIVE${RESET}`;
    const patterns = record.patterns.map((p) => this.formatPattern(p)).join(', ') || '-';

    const cols = this.padColumns([
      this.truncate(record.name, 30),
      this.truncate(record.suite, 20),
      `${scoreColor}${(record.flakinessScore * 100).toFixed(0)}%${RESET}`,
      `${record.totalRuns}`,
      `${GREEN}${record.passCount}${RESET}/${RED}${record.failCount}${RESET}`,
      patterns,
      statusIcon,
    ]);
    console.log(cols);
  }

  private printQuarantined(result: FlakinessReport): void {
    const quarantined = result.records.filter((r) => r.quarantined);
    if (quarantined.length === 0) return;

    console.log(`${BOLD}${RED}Quarantined Tests (${quarantined.length}):${RESET}`);
    for (const record of quarantined) {
      console.log(`  ${RED}x${RESET} ${record.name} ${DIM}(score: ${(record.flakinessScore * 100).toFixed(0)}%)${RESET}`);
    }
    console.log();

    const pattern = quarantined.map((r) => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    console.log(`${BOLD}Playwright --grep-invert pattern:${RESET}`);
    console.log(`  ${DIM}npx playwright test --grep-invert "${pattern}"${RESET}`);
    console.log();
  }

  private formatPattern(pattern: DetectedPattern): string {
    const icons: Record<string, string> = {
      timing: `${YELLOW}T${RESET}`,
      network: `${RED}N${RESET}`,
      ordering: `${CYAN}O${RESET}`,
      unknown: '?',
    };
    return `${icons[pattern.type] || '?'}(${(pattern.confidence * 100).toFixed(0)}%)`;
  }

  private padColumns(cols: string[]): string {
    const widths = [32, 22, 8, 6, 10, 20, 14];
    return cols.map((col, i) => col.padEnd(widths[i] || 10)).join(' ');
  }

  private truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.substring(0, maxLen - 2) + '..' : str;
  }
}
