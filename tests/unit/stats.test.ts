import { describe, it, expect } from 'vitest';
import {
  mean,
  standardDeviation,
  coefficientOfVariation,
  median,
  percentile,
  flakinessScore,
} from '../../src/utils/stats';

describe('stats', () => {
  describe('mean', () => {
    it('should calculate the mean of values', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(mean([42])).toBe(42);
    });
  });

  describe('standardDeviation', () => {
    it('should calculate standard deviation', () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.0, 1);
    });

    it('should return 0 for fewer than 2 values', () => {
      expect(standardDeviation([5])).toBe(0);
      expect(standardDeviation([])).toBe(0);
    });
  });

  describe('coefficientOfVariation', () => {
    it('should calculate CV', () => {
      const result = coefficientOfVariation([100, 200, 300]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should return 0 when mean is 0', () => {
      expect(coefficientOfVariation([0, 0, 0])).toBe(0);
    });
  });

  describe('median', () => {
    it('should calculate median for odd-length array', () => {
      expect(median([1, 3, 5])).toBe(3);
    });

    it('should calculate median for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('should return 0 for empty array', () => {
      expect(median([])).toBe(0);
    });
  });

  describe('percentile', () => {
    it('should calculate 50th percentile (median)', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('should calculate 90th percentile', () => {
      const result = percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 90);
      expect(result).toBeCloseTo(91, 0);
    });
  });

  describe('flakinessScore', () => {
    it('should return 0 for all passes', () => {
      expect(flakinessScore(10, 0)).toBe(0);
    });

    it('should return 0 for all failures', () => {
      expect(flakinessScore(0, 10)).toBe(0);
    });

    it('should return 0.5 for equal pass/fail', () => {
      expect(flakinessScore(5, 5)).toBe(0.5);
    });

    it('should return value between 0 and 0.5', () => {
      const score = flakinessScore(7, 3);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(0.5);
    });

    it('should return 0 for no runs', () => {
      expect(flakinessScore(0, 0)).toBe(0);
    });
  });
});
