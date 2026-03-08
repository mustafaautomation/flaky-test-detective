import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, writeDefaultConfig } from '../../src/core/config';
import { DEFAULT_CONFIG } from '../../src/core/types';

const TMP_DIR = path.join(__dirname, '.tmp-config');

describe('config', () => {
  afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
  });

  it('should return default config when no file found', () => {
    const config = loadConfig();
    expect(config.storage.type).toBe(DEFAULT_CONFIG.storage.type);
    expect(config.thresholds.flakiness).toBe(DEFAULT_CONFIG.thresholds.flakiness);
  });

  it('should load config from JSON file', () => {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    const configPath = path.join(TMP_DIR, 'test-config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        storage: { type: 'json', path: './data.json' },
        thresholds: { flakiness: 0.2 },
      }),
      'utf-8'
    );

    const config = loadConfig(configPath);
    expect(config.storage.type).toBe('json');
    expect(config.thresholds.flakiness).toBe(0.2);
    expect(config.thresholds.quarantine).toBe(DEFAULT_CONFIG.thresholds.quarantine);
  });

  it('should write default config', () => {
    const configPath = path.join(TMP_DIR, 'default.json');
    writeDefaultConfig(configPath);

    expect(fs.existsSync(configPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(data.storage.type).toBe('sqlite');
  });
});
