import { createHash } from 'crypto';

const SEPARATORS = ['\n\n', '\n', '.', ' '];

export interface ChunkingStrategy {
  readonly name: string;
  chunk(text: string, options?: Record<string, unknown>): Promise<string[]>;
}

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

const TOKEN_ESTIMATE_RATIO = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_ESTIMATE_RATIO);
}

function splitOn(text: string, separator: string): string[] {
  if (separator === '.') {
    const parts = text.split(separator);
    if (parts.length <= 1) return [text];
    const merged: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      merged.push(parts[i] + '.');
    }
    merged[merged.length - 1] += parts[parts.length - 1];
    return merged.filter((p) => p.length > 0);
  }
  return text.split(separator).filter((p) => p.length > 0);
}

export class ChunkingService implements ChunkingStrategy {
  readonly name = 'recursive-character';

  private readonly defaultChunkSize: number;
  private readonly defaultOverlap: number;

  constructor(defaultChunkSize = 256, overlapRatio = 0.2) {
    this.defaultChunkSize = defaultChunkSize;
    this.defaultOverlap = Math.round(defaultChunkSize * overlapRatio);
  }

  async chunk(
    text: string,
    options?: Record<string, unknown>,
  ): Promise<string[]> {
    return this.chunkText(text, {
      chunkSize: (options?.chunkSize as number) ?? this.defaultChunkSize,
      overlap: (options?.overlap as number) ?? this.defaultOverlap,
    });
  }

  async chunkText(text: string, options?: ChunkOptions): Promise<string[]> {
    const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
    const overlap = options?.overlap ?? this.defaultOverlap;

    if (!text) return [];

    if (estimateTokens(text) <= chunkSize) return [text];

    const chunks = this.recursiveSplit(text, SEPARATORS, chunkSize, 0);

    return this.applyOverlap(chunks, overlap);
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number,
    depth: number,
  ): string[] {
    if (separators.length === 0 || depth >= SEPARATORS.length) {
      return this.splitByTokens(text, chunkSize);
    }

    const separator = separators[0];
    const pieces = splitOn(text, separator);

    if (pieces.length <= 1 && pieces[0] === text) {
      return this.recursiveSplit(text, separators.slice(1), chunkSize, depth + 1);
    }

    const result: string[] = [];
    for (const piece of pieces) {
      if (estimateTokens(piece) <= chunkSize) {
        result.push(piece);
      } else {
        const subChunks = this.recursiveSplit(
          piece,
          separators.slice(1),
          chunkSize,
          depth + 1,
        );
        result.push(...subChunks);
      }
    }

    return this.mergeSmallChunks(result, chunkSize);
  }

  private mergeSmallChunks(chunks: string[], chunkSize: number): string[] {
    if (chunks.length <= 1) return chunks;

    const merged: string[] = [];
    let buffer = '';

    for (const chunk of chunks) {
      if (buffer && estimateTokens(buffer + chunk) <= chunkSize) {
        buffer += chunk;
      } else {
        if (buffer) merged.push(buffer);
        buffer = chunk;
      }
    }
    if (buffer) merged.push(buffer);

    return merged;
  }

  private splitByTokens(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    const maxCharsPerChunk = chunkSize * TOKEN_ESTIMATE_RATIO;

    while (start < text.length) {
      const end = Math.min(start + maxCharsPerChunk, text.length);
      chunks.push(text.slice(start, end));
      start = end;
    }

    return chunks;
  }

  private applyOverlap(chunks: string[], overlap: number): string[] {
    if (chunks.length <= 1) return chunks;

    const overlapChars = overlap * TOKEN_ESTIMATE_RATIO;
    const result: string[] = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1];
      const overlapText = prev.slice(-overlapChars);
      result.push(overlapText + chunks[i]);
    }

    return result;
  }

  generateContentHash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }
}
