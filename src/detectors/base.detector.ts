import { DetectedPattern, FlakinessRecord, DetectiveConfig } from '../core/types';

export abstract class BaseDetector {
  abstract type: DetectedPattern['type'];
  abstract detect(record: FlakinessRecord, config: DetectiveConfig): DetectedPattern | null;
}
