import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { EmbeddedChunk, SearchResult } from '@intent-ide/core';

export interface VectorStoreOptions {
  storagePath: string;
  tableName?: string;
}

/**
 * LanceDB 기반 벡터 저장소
 * MVP: 로컬 임베디드 벡터 DB
 */
export class VectorStore {
  private options: VectorStoreOptions;
  private db: unknown = null;
  private table: unknown = null;
  private inMemory: EmbeddedChunk[] = [];

  constructor(options: VectorStoreOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    await mkdir(this.options.storagePath, { recursive: true });

    try {
      // Try to use LanceDB if available
      const lancedb = await import('vectordb');
      this.db = await lancedb.connect(
        join(this.options.storagePath, 'vectors')
      );
    } catch {
      // Fallback to in-memory store
      this.db = null;
    }
  }

  async upsert(chunks: EmbeddedChunk[]): Promise<void> {
    if (!this.db) {
      // In-memory fallback
      for (const chunk of chunks) {
        const idx = this.inMemory.findIndex((c) => c.id === chunk.id);
        if (idx >= 0) {
          this.inMemory[idx] = chunk;
        } else {
          this.inMemory.push(chunk);
        }
      }
      return;
    }

    // LanceDB upsert
    const db = this.db as {
      openTable: (name: string) => Promise<unknown>;
      createTable: (name: string, data: unknown[]) => Promise<unknown>;
    };

    const tableName = this.options.tableName ?? 'code_chunks';
    const records = chunks.map((c) => ({
      id: c.id,
      vector: c.embedding,
      filePath: c.filePath,
      content: c.content,
      startLine: c.startLine,
      endLine: c.endLine,
      symbols: JSON.stringify(c.symbols),
      language: c.language,
      chunkType: c.chunkType,
      embeddedAt: c.embeddedAt,
    }));

    try {
      const t = await db.openTable(tableName);
      await (t as { add: (data: unknown[]) => Promise<void> }).add(records);
      this.table = t;
    } catch {
      this.table = await db.createTable(tableName, records);
    }
  }

  async search(queryEmbedding: number[], topK: number): Promise<SearchResult[]> {
    if (!this.table) {
      return this.inMemorySearch(queryEmbedding, topK);
    }

    const t = this.table as {
      search: (v: number[]) => { limit: (k: number) => { execute: () => Promise<unknown[]> } };
    };

    const results = await t.search(queryEmbedding).limit(topK).execute();
    return (results as Array<Record<string, unknown>>).map((r) => ({
      chunk: {
        id: String(r['id'] ?? ''),
        filePath: String(r['filePath'] ?? ''),
        content: String(r['content'] ?? ''),
        startLine: Number(r['startLine'] ?? 0),
        endLine: Number(r['endLine'] ?? 0),
        symbols: JSON.parse(String(r['symbols'] ?? '[]')) as string[],
        language: String(r['language'] ?? ''),
        chunkType: (r['chunkType'] ?? 'block') as EmbeddedChunk['chunkType'],
      },
      score: Number(r['_distance'] ?? 0),
      tokenCount: Math.ceil(String(r['content'] ?? '').length / 4),
    }));
  }

  async deleteByFile(filePath: string): Promise<void> {
    if (!this.table) {
      this.inMemory = this.inMemory.filter((c) => c.filePath !== filePath);
      return;
    }

    const t = this.table as { delete: (filter: string) => Promise<void> };
    await t.delete(`filePath = '${filePath}'`);
  }

  private inMemorySearch(queryEmbedding: number[], topK: number): SearchResult[] {
    return this.inMemory
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
        tokenCount: Math.ceil(chunk.content.length / 4),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += (a[i] ?? 0) * (b[i] ?? 0);
      magA += (a[i] ?? 0) ** 2;
      magB += (b[i] ?? 0) ** 2;
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dot / magnitude;
  }

  getSize(): number {
    return this.inMemory.length;
  }
}
