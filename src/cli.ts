#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { loadConfig, writeDefaultConfig } from './core/config';
import { Analyzer } from './core/analyzer';
import { ConsoleReporter } from './reporters/console.reporter';
import { JsonReporter } from './reporters/json.reporter';
import { HtmlReporter } from './reporters/html.reporter';
import { GithubReporter } from './reporters/github.reporter';
import { setLogLevel } from './utils/logger';

const program = new Command();

program
  .name('flaky-detective')
  .description('Detect, track, and quarantine flaky tests')
  .version('2.0.0');

program
  .command('analyze')
  .description('Analyze test results for flakiness')
  .argument('<files...>', 'Test result files (Playwright JSON or JUnit XML)')
  .option('-c, --config <path>', 'Path to config file')
  .option(
    '-r, --reporter <type>',
    'Reporter: console, json, html, github (comma-separated)',
    'console',
  )
  .option('-o, --output <dir>', 'Output directory for reports', '.flaky-detective/reports')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (files: string[], options) => {
    if (options.verbose) setLogLevel('debug');

    const config = loadConfig(options.config);
    const analyzer = new Analyzer(config);
    await analyzer.init();

    const report = analyzer.analyze(files);
    runReporters(options.reporter, options.output, report);
    analyzer.close();

    // Log quarantine info but don't exit 1 — quarantine is intentional
    if (report.quarantinedTests > 0) {
      console.log(`\n${report.quarantinedTests} test(s) quarantined. Use 'flaky-detective quarantine' for grep pattern.`);
    }
  });

program
  .command('report')
  .description('Generate report from stored data')
  .option('-c, --config <path>', 'Path to config file')
  .option(
    '-r, --reporter <type>',
    'Reporter: console, json, html, github (comma-separated)',
    'console',
  )
  .option('-o, --output <dir>', 'Output directory', '.flaky-detective/reports')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) setLogLevel('debug');

    const config = loadConfig(options.config);
    const analyzer = new Analyzer(config);
    await analyzer.init();

    const report = analyzer.getReport();
    runReporters(options.reporter, options.output, report);
    analyzer.close();
  });

program
  .command('quarantine')
  .description('Output quarantine grep pattern for Playwright')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) setLogLevel('debug');

    const config = loadConfig(options.config);
    const analyzer = new Analyzer(config);
    await analyzer.init();

    const pattern = analyzer.getQuarantinePattern();
    if (pattern) {
      console.log(pattern);
    } else {
      console.log('No quarantined tests.');
    }
    analyzer.close();
  });

program
  .command('trends')
  .description('Show flakiness trends')
  .option('-c, --config <path>', 'Path to config file')
  .option('-d, --days <number>', 'Number of days to show', '30')
  .option('-r, --reporter <type>', 'Reporter: console, html (comma-separated)', 'console')
  .option('-o, --output <dir>', 'Output directory', '.flaky-detective/reports')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) setLogLevel('debug');

    const config = loadConfig(options.config);
    const analyzer = new Analyzer(config);
    await analyzer.init();

    const report = analyzer.getReport();
    runReporters(options.reporter, options.output, report);
    analyzer.close();
  });

program
  .command('init')
  .description('Initialize flaky-detective configuration')
  .action(() => {
    writeDefaultConfig('flaky-detective.config.json');
    console.log('Done! Edit flaky-detective.config.json and run:');
    console.log('  npx flaky-detective analyze <test-results.json>');
  });

function runReporters(
  reporterStr: string,
  outputDir: string,
  report: import('./core/types').FlakinessReport,
): void {
  const types = reporterStr.split(',').map((t: string) => t.trim());

  for (const type of types) {
    switch (type) {
      case 'console':
        new ConsoleReporter().report(report);
        break;
      case 'json':
        new JsonReporter(path.join(outputDir, 'report.json')).report(report);
        break;
      case 'html':
        new HtmlReporter(path.join(outputDir, 'report.html')).report(report);
        break;
      case 'github': {
        const md = new GithubReporter().report(report);
        console.log(md);
        break;
      }
      default:
        console.error(`Unknown reporter: "${type}". Valid: console, json, html, github`);
    }
  }
}

program.parse();
