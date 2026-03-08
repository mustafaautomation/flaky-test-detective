import { BaseDetector } from './base.detector';
import { DetectedPattern, FlakinessRecord, DetectiveConfig } from '../core/types';
import { coefficientOfVariation, mean, standardDeviation } from '../utils/stats';

export class TimingDetector extends BaseDetector {
  type = 'timing' as const;

  detect(record: FlakinessRecord, config: DetectiveConfig): DetectedPattern | null {
    if (record.durations.length < config.thresholds.minRuns) return null;

    const cv = coefficientOfVariation(record.durations);
    if (cv < config.thresholds.timingCv) return null;

    const avg = mean(record.durations);
    const stdDev = standardDeviation(record.durations);
    const maxDuration = Math.max(...record.durations);
    const minDuration = Math.min(...record.durations);

    const confidence = Math.min(cv / 1.0, 1.0);

    return {
      type: 'timing',
      confidence,
      description: `High duration variance detected (CV: ${(cv * 100).toFixed(1)}%). Range: ${minDuration}ms - ${maxDuration}ms`,
      evidence: [
        `Mean duration: ${avg.toFixed(0)}ms`,
        `Std deviation: ${stdDev.toFixed(0)}ms`,
        `Coefficient of variation: ${(cv * 100).toFixed(1)}%`,
        `Min: ${minDuration}ms, Max: ${maxDuration}ms`,
      ],
    };
  }
}
