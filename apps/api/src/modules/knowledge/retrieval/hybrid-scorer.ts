export interface HybridScoreWeights {
  vectorWeight: number;
  keywordWeight: number;
}

export class HybridScorer {
  private readonly weights: HybridScoreWeights;
  private readonly epsilon = 1e-10;

  constructor(weights?: Partial<HybridScoreWeights>) {
    this.weights = {
      vectorWeight: weights?.vectorWeight ?? 0.7,
      keywordWeight: weights?.keywordWeight ?? 0.3,
    };
    this.normalizeWeights();
  }

  combine(vectorScore: number, keywordScore: number): number {
    const normalizedVector = this.normalize(vectorScore);
    const normalizedKeyword = this.normalize(keywordScore);
    return (
      normalizedVector * this.weights.vectorWeight +
      normalizedKeyword * this.weights.keywordWeight
    );
  }

  private normalize(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  private normalizeWeights(): void {
    const total = this.weights.vectorWeight + this.weights.keywordWeight;
    if (Math.abs(total) < this.epsilon) {
      this.weights.vectorWeight = 0.7;
      this.weights.keywordWeight = 0.3;
      return;
    }
    this.weights.vectorWeight /= total;
    this.weights.keywordWeight /= total;
  }
}
