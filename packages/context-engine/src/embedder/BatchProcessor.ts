import type { CodeChunk, EmbeddedChunk } from '@intent-ide/core';
import type { EmbeddingService } from './EmbeddingService.js';

export interface BatchProcessorOptions {
  batchSize: number;
  concurrency: number;
  onProgress?: (processed: number, total: number) => void;
}

export class BatchProcessor {
  private service: EmbeddingService;
  private options: BatchProcessorOptions;

  constructor(service: EmbeddingService, options: Partial<BatchProcessorOptions> = {}) {
    this.service = service;
    this.options = {
      batchSize: options.batchSize ?? 20,
      concurrency: options.concurrency ?? 4,
      ...(options.onProgress !== undefined ? { onProgress: options.onProgress } : {}),
    };
  }

  async process(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
    const results: EmbeddedChunk[] = [];
    const total = chunks.length;
    let processed = 0;

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.options.batchSize) {
      const batch = chunks.slice(i, i + this.options.batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
      processed += batch.length;

      if (this.options.onProgress) {
        this.options.onProgress(processed, total);
      }
    }

    return results;
  }

  private async processBatch(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
    const concurrency = this.options.concurrency;
    const results: EmbeddedChunk[] = [];

    for (let i = 0; i < chunks.length; i += concurrency) {
      const concurrentChunks = chunks.slice(i, i + concurrency);
      const concurrentResults = await Promise.all(
        concurrentChunks.map((chunk) => this.service.embed(chunk))
      );
      results.push(...concurrentResults);
    }

    return results;
  }
}
