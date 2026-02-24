import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CodeChunk, EmbeddedChunk } from '@intent-ide/core';

const execFileAsync = promisify(execFile);

export interface EmbeddingServiceOptions {
  /** 임베딩 생성에 사용할 CLI 명령어 (기본: 간단한 해시 기반) */
  provider: 'hash' | 'ollama' | 'openai';
  ollamaModel?: string;
  dimension?: number;
}

/**
 * 코드 청크를 벡터로 임베딩하는 서비스
 * MVP: 해시 기반 간단 임베딩 (로컬 LLM 없이도 동작)
 * 추후: Ollama/OpenAI 임베딩으로 교체 가능
 */
export class EmbeddingService {
  private options: EmbeddingServiceOptions;
  private dimension: number;

  constructor(options: EmbeddingServiceOptions = { provider: 'hash' }) {
    this.options = options;
    this.dimension = options.dimension ?? 384;
  }

  async embed(chunk: CodeChunk): Promise<EmbeddedChunk> {
    const embedding = await this.generateEmbedding(chunk.content);
    return {
      ...chunk,
      embedding,
      embeddedAt: Date.now(),
    };
  }

  async embedBatch(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
    return Promise.all(chunks.map((chunk) => this.embed(chunk)));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    switch (this.options.provider) {
      case 'hash':
        return this.hashEmbedding(text);
      case 'ollama':
        return this.ollamaEmbedding(text);
      default:
        return this.hashEmbedding(text);
    }
  }

  /**
   * 간단한 해시 기반 임베딩 (외부 의존성 없음)
   * 코드 구조를 반영하는 간단한 특징 벡터
   */
  private hashEmbedding(text: string): number[] {
    const vector = new Array<number>(this.dimension).fill(0);
    const words = text.split(/\s+/);

    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      const idx = hash % this.dimension;
      vector[idx] = (vector[idx] ?? 0) + 1 / (i + 1);
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((v) => v / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private async ollamaEmbedding(text: string): Promise<number[]> {
    try {
      const { stdout } = await execFileAsync('ollama', [
        'embeddings',
        '--model',
        this.options.ollamaModel ?? 'nomic-embed-text',
        text.slice(0, 2000), // Limit input
      ]);
      const parsed = JSON.parse(stdout) as { embedding?: number[] };
      return parsed.embedding ?? this.hashEmbedding(text);
    } catch {
      // Fallback to hash if ollama not available
      return this.hashEmbedding(text);
    }
  }
}
