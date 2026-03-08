import { BaseDetector } from './base.detector';
import { DetectedPattern, FlakinessRecord, DetectiveConfig } from '../core/types';

const NETWORK_KEYWORDS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'socket hang up',
  'network error',
  'fetch failed',
  'timeout',
  'TIMEOUT',
  'net::ERR_',
  'ERR_NETWORK',
  'ERR_CONNECTION',
  'EPIPE',
  'request timed out',
  'connection refused',
  'DNS resolution',
  '502',
  '503',
  '504',
];

export class NetworkDetector extends BaseDetector {
  type = 'network' as const;

  detect(record: FlakinessRecord, config: DetectiveConfig): DetectedPattern | null {
    if (record.errors.length === 0) return null;
    if (record.totalRuns < config.thresholds.minRuns) return null;

    const networkErrors: string[] = [];
    const matchedKeywords = new Set<string>();

    for (const error of record.errors) {
      const lowerError = error.toLowerCase();
      for (const keyword of NETWORK_KEYWORDS) {
        if (lowerError.includes(keyword.toLowerCase())) {
          networkErrors.push(error);
          matchedKeywords.add(keyword);
          break;
        }
      }
    }

    if (networkErrors.length === 0) return null;

    const confidence = Math.min(networkErrors.length / record.errors.length, 1.0);

    return {
      type: 'network',
      confidence,
      description: `Network-related failures detected in ${networkErrors.length}/${record.errors.length} errors`,
      evidence: [
        `Matched keywords: ${[...matchedKeywords].join(', ')}`,
        ...networkErrors.slice(0, 3).map((e) => `Error: ${e.substring(0, 120)}`),
      ],
    };
  }
}
