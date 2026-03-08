import * as fs from 'fs';
import { DetectiveConfig, FlakinessReport, ParsedRunResult } from './types';
import { BaseParser, detectParser } from '../parsers/base.parser';
import { PlaywrightParser } from '../parsers/playwright.parser';
import { JUnitParser } from '../parsers/junit.parser';
import { BaseStorage } from '../storage/base.storage';
import { SqliteStorage } from '../storage/sqlite.storage';
import { JsonStorage } from '../storage/json.storage';
import { BaseDetector } from '../detectors/base.detector';
import { TimingDetector } from '../detectors/timing.detector';
import { NetworkDetector } from '../detectors/network.detector';
import { OrderingDetector } from '../detectors/ordering.detector';
import { logger } from '../utils/logger';

export class Analyzer {
  private config: DetectiveConfig;
  private parsers: BaseParser[];
  private storage: BaseStorage;
  private detectors: BaseDetector[];

  constructor(config: DetectiveConfig) {
    this.config = config;
    this.parsers = this.initParsers();
    this.storage = this.initStorage();
    this.detectors = [new TimingDetector(), new NetworkDetector(), new OrderingDetector()];
  }

  async init(): Promise<void> {
    if (this.storage.initAsync) {
      await this.storage.initAsync();
    } else {
      this.storage.init();
    }
  }

  analyze(filePaths: string[]): FlakinessReport {
    for (const filePath of filePaths) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const run = this.parseFile(content);
      if (run) {
        this.storage.storeRun(run);
        logger.info(`Ingested ${run.tests.length} tests from ${filePath} (${run.framework})`);
      } else {
        logger.warn(`Could not parse: ${filePath}`);
      }
    }

    return this.buildReport();
  }

  analyzeContent(content: string): FlakinessReport {
    const run = this.parseFile(content);
    if (run) {
      this.storage.storeRun(run);
      logger.info(`Ingested ${run.tests.length} tests (${run.framework})`);
    }
    return this.buildReport();
  }

  getReport(): FlakinessReport {
    return this.buildReport();
  }

  getQuarantinePattern(): string {
    const records = this.storage.getAllRecords();
    const quarantined = records.filter((r) => r.quarantined);
    if (quarantined.length === 0) return '';

    return quarantined.map((r) => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  }

  close(): void {
    this.storage.close();
  }

  private parseFile(content: string): ParsedRunResult | null {
    const parser = detectParser(this.parsers, content);
    if (!parser) return null;
    logger.debug(`Using ${parser.name} parser`);
    return parser.parse(content);
  }

  private buildReport(): FlakinessReport {
    const records = this.storage.getAllRecords();

    for (const record of records) {
      if (record.totalRuns < this.config.thresholds.minRuns) continue;

      record.patterns = [];
      for (const detector of this.detectors) {
        const pattern = detector.detect(record, this.config);
        if (pattern) {
          record.patterns.push(pattern);
        }
      }

      record.quarantined = record.flakinessScore >= this.config.thresholds.quarantine;
      this.storage.updateRecord(record);
    }

    const flakyRecords = records.filter(
      (r) => r.flakinessScore >= this.config.thresholds.flakiness && r.totalRuns >= this.config.thresholds.minRuns
    );

    const quarantinedCount = records.filter((r) => r.quarantined).length;
    const trends = this.storage.getTrends(30);

    return {
      timestamp: new Date().toISOString(),
      totalTests: records.length,
      flakyTests: flakyRecords.length,
      quarantinedTests: quarantinedCount,
      overallFlakinessRate: records.length > 0 ? flakyRecords.length / records.length : 0,
      records: flakyRecords,
      trends,
    };
  }

  private initParsers(): BaseParser[] {
    const all: BaseParser[] = [new PlaywrightParser(), new JUnitParser()];

    if (this.config.parsers.includes('auto')) return all;

    return all.filter((p) => this.config.parsers.includes(p.name as 'playwright' | 'junit'));
  }

  private initStorage(): BaseStorage {
    if (this.config.storage.type === 'json') {
      return new JsonStorage(this.config.storage.path);
    }
    return new SqliteStorage(this.config.storage.path);
  }
}
