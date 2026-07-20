import { HybridScorer } from '../retrieval/hybrid-scorer';

describe('HybridScorer', () => {
  describe('combine', () => {
    it('should combine scores with default weights', () => {
      const scorer = new HybridScorer();
      const score = scorer.combine(0.8, 0.6);
      expect(score).toBeCloseTo(0.8 * 0.7 + 0.6 * 0.3, 5);
    });

    it('should combine scores with custom weights', () => {
      const scorer = new HybridScorer({ vectorWeight: 0.5, keywordWeight: 0.5 });
      const score = scorer.combine(0.8, 0.6);
      expect(score).toBeCloseTo(0.7, 5);
    });

    it('should normalize scores to 0..1 range', () => {
      const scorer = new HybridScorer();
      const score = scorer.combine(-0.5, 1.5);
      expect(score).toBeCloseTo(0 * 0.7 + 1 * 0.3, 5);
    });

    it('should handle zero scores', () => {
      const scorer = new HybridScorer();
      expect(scorer.combine(0, 0)).toBe(0);
    });

    it('should handle perfect scores', () => {
      const scorer = new HybridScorer();
      expect(scorer.combine(1, 1)).toBe(1);
    });

    it('should normalize weights when total is zero', () => {
      const scorer = new HybridScorer({ vectorWeight: 0, keywordWeight: 0 });
      const score = scorer.combine(1, 1);
      expect(score).toBeCloseTo(0.7 + 0.3, 5);
    });

    it('should normalize weights when total is not 1', () => {
      const scorer = new HybridScorer({ vectorWeight: 2, keywordWeight: 2 });
      const score = scorer.combine(0.8, 0.6);
      expect(score).toBeCloseTo(0.7, 5);
    });
  });
});
