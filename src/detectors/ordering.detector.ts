import { BaseDetector } from './base.detector';
import { DetectedPattern, FlakinessRecord, DetectiveConfig } from '../core/types';
import { standardDeviation, mean } from '../utils/stats';

export class OrderingDetector extends BaseDetector {
  type = 'ordering' as const;

  detect(record: FlakinessRecord, config: DetectiveConfig): DetectedPattern | null {
    if (record.positions.length < config.thresholds.minRuns) return null;
    if (record.flakinessScore === 0) return null;

    const uniquePositions = new Set(record.positions);
    if (uniquePositions.size <= 1) return null;

    const posStdDev = standardDeviation(record.positions);
    const posMean = mean(record.positions);

    if (posStdDev === 0) return null;

    const positionCv = posMean > 0 ? posStdDev / posMean : 0;

    if (positionCv < 0.2) return null;

    const confidence = Math.min(positionCv, 1.0) * 0.7;

    return {
      type: 'ordering',
      confidence,
      description: `Test position varies across runs, suggesting order dependency`,
      evidence: [
        `Positions observed: ${[...uniquePositions].sort((a, b) => a - b).join(', ')}`,
        `Position mean: ${posMean.toFixed(1)}, std dev: ${posStdDev.toFixed(1)}`,
        `Position CV: ${(positionCv * 100).toFixed(1)}%`,
      ],
    };
  }
}
