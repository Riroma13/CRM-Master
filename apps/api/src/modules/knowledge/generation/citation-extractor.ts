import type { KbChunkResult, KbCitation } from '@shared/knowledge';

export class CitationExtractor {
  private readonly citationRegex = /\[(\d+)\]/g;

  extractCitations(response: string, chunks: KbChunkResult[]): KbCitation[] {
    const citations: KbCitation[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = this.citationRegex.exec(response)) !== null) {
      const index = parseInt(match[1], 10);
      const chunkResult = chunks[index];
      if (!chunkResult) continue;

      const key = `${chunkResult.chunk.sourceType}:${chunkResult.chunk.sourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      citations.push({
        sourceType: chunkResult.chunk.sourceType,
        sourceId: chunkResult.chunk.sourceId,
        content: chunkResult.chunk.content.slice(0, 200),
        relevanceScore: chunkResult.score,
      });
    }

    return citations;
  }

  validateCitations(
    citations: KbCitation[],
    chunks: KbChunkResult[],
  ): KbCitation[] {
    const validSourceIds = new Set(
      chunks.map((c) => `${c.chunk.sourceType}:${c.chunk.sourceId}`),
    );

    return citations.filter((c) =>
      validSourceIds.has(`${c.sourceType}:${c.sourceId}`),
    );
  }
}
