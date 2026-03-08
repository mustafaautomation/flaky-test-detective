import * as fs from 'fs';
import * as path from 'path';
import { DetectiveConfig, DEFAULT_CONFIG } from './types';
import { logger } from '../utils/logger';

const CONFIG_FILES = [
  'flaky-detective.config.json',
  'flaky-detective.config.js',
  '.flaky-detective.json',
];

export function loadConfig(configPath?: string): DetectiveConfig {
  if (configPath) {
    return readConfigFile(configPath);
  }

  for (const filename of CONFIG_FILES) {
    const fullPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(fullPath)) {
      logger.debug(`Found config file: ${fullPath}`);
      return readConfigFile(fullPath);
    }
  }

  logger.debug('No config file found, using defaults');
  return { ...DEFAULT_CONFIG };
}

function readConfigFile(filePath: string): DetectiveConfig {
  const ext = path.extname(filePath);
  let userConfig: Partial<DetectiveConfig>;

  if (ext === '.json') {
    const raw = fs.readFileSync(filePath, 'utf-8');
    userConfig = JSON.parse(raw);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    userConfig = require(path.resolve(filePath));
  }

  return mergeConfig(userConfig);
}

function mergeConfig(user: Partial<DetectiveConfig>): DetectiveConfig {
  return {
    storage: { ...DEFAULT_CONFIG.storage, ...user.storage },
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...user.thresholds },
    parsers: user.parsers || DEFAULT_CONFIG.parsers,
    reporters: user.reporters || DEFAULT_CONFIG.reporters,
    outputDir: user.outputDir || DEFAULT_CONFIG.outputDir,
  };
}

export function writeDefaultConfig(outputPath: string): void {
  const config = {
    storage: DEFAULT_CONFIG.storage,
    thresholds: DEFAULT_CONFIG.thresholds,
    parsers: DEFAULT_CONFIG.parsers,
    reporters: DEFAULT_CONFIG.reporters,
    outputDir: DEFAULT_CONFIG.outputDir,
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');
  logger.info(`Config written to ${outputPath}`);
}
