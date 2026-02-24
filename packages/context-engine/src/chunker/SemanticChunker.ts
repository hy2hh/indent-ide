import type { CodeChunk } from '@intent-ide/core';

export interface ChunkingOptions {
  maxChunkTokens: number;
  overlapTokens: number;
  minChunkTokens: number;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkTokens: 512,
  overlapTokens: 50,
  minChunkTokens: 20,
};

/**
 * 코드 청크를 토큰 예산에 맞게 재분할하는 시맨틱 청커
 */
export class SemanticChunker {
  private options: ChunkingOptions;

  constructor(options: Partial<ChunkingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 대략적인 토큰 수 추정 (4자 ≈ 1토큰)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * 청크가 너무 크면 분할, 너무 작으면 병합
   */
  rechunk(chunks: CodeChunk[]): CodeChunk[] {
    const result: CodeChunk[] = [];
    let pendingChunks: CodeChunk[] = [];
    let pendingTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);

      if (chunkTokens > this.options.maxChunkTokens) {
        // Flush pending
        if (pendingChunks.length > 0) {
          result.push(this.mergeChunks(pendingChunks));
          pendingChunks = [];
          pendingTokens = 0;
        }
        // Split large chunk
        const splitChunks = this.splitChunk(chunk);
        result.push(...splitChunks);
      } else if (
        pendingTokens + chunkTokens > this.options.maxChunkTokens &&
        pendingChunks.length > 0
      ) {
        result.push(this.mergeChunks(pendingChunks));
        pendingChunks = [chunk];
        pendingTokens = chunkTokens;
      } else {
        pendingChunks.push(chunk);
        pendingTokens += chunkTokens;
      }
    }

    if (pendingChunks.length > 0) {
      result.push(this.mergeChunks(pendingChunks));
    }

    return result;
  }

  private splitChunk(chunk: CodeChunk): CodeChunk[] {
    const lines = chunk.content.split('\n');
    const result: CodeChunk[] = [];
    let lineBuffer: string[] = [];
    let tokenBuffer = 0;
    let currentStart = chunk.startLine;
    let partIndex = 0;

    for (const line of lines) {
      const lineTokens = this.estimateTokens(line);
      if (tokenBuffer + lineTokens > this.options.maxChunkTokens && lineBuffer.length > 0) {
        result.push({
          ...chunk,
          id: `${chunk.id}:part${partIndex}`,
          content: lineBuffer.join('\n'),
          startLine: currentStart,
          endLine: currentStart + lineBuffer.length - 1,
        });
        // Overlap: keep last few lines
        const overlapLines = lineBuffer.slice(-3);
        lineBuffer = [...overlapLines, line];
        currentStart = currentStart + lineBuffer.length - overlapLines.length - 1;
        tokenBuffer = this.estimateTokens(lineBuffer.join('\n'));
        partIndex++;
      } else {
        lineBuffer.push(line);
        tokenBuffer += lineTokens;
      }
    }

    if (lineBuffer.length > 0) {
      result.push({
        ...chunk,
        id: `${chunk.id}:part${partIndex}`,
        content: lineBuffer.join('\n'),
        startLine: currentStart,
        endLine: currentStart + lineBuffer.length - 1,
      });
    }

    return result;
  }

  private mergeChunks(chunks: CodeChunk[]): CodeChunk {
    const first = chunks[0]!;
    const last = chunks[chunks.length - 1]!;
    const allSymbols = [...new Set(chunks.flatMap((c) => c.symbols))];

    return {
      id: first.id,
      filePath: first.filePath,
      content: chunks.map((c) => c.content).join('\n'),
      startLine: first.startLine,
      endLine: last.endLine,
      symbols: allSymbols,
      language: first.language,
      chunkType: first.chunkType,
    };
  }
}
