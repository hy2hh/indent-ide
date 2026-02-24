import type { SearchResult, ContextWindow } from '@intent-ide/core';
import { TOKEN_BUDGETS } from '@intent-ide/core';
import type { VectorStore } from '../store/VectorStore.js';
import type { EmbeddingService } from '../embedder/EmbeddingService.js';
import type { RankedNode } from '../graph/GraphRanker.js';

export interface RetrievalQuery {
  query: string;
  agentId: string;
  agentRole: 'coordinator' | 'implementor' | 'verifier';
  topK?: number;
  fileFilter?: string[];
}

export class ContextRetriever {
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;

  constructor(vectorStore: VectorStore, embeddingService: EmbeddingService) {
    this.vectorStore = vectorStore;
    this.embeddingService = embeddingService;
  }

  async retrieve(query: RetrievalQuery): Promise<ContextWindow> {
    const budget = this.getBudget(query.agentRole);
    const topK = query.topK ?? 10;

    // Generate query embedding
    const queryChunk = {
      id: 'query',
      filePath: '',
      content: query.query,
      startLine: 0,
      endLine: 0,
      symbols: [],
      language: 'text',
      chunkType: 'block' as const,
    };
    const embedded = await this.embeddingService.embed(queryChunk);
    const results = await this.vectorStore.search(embedded.embedding, topK * 2);

    // Apply file filter
    const filtered = query.fileFilter
      ? results.filter((r) => query.fileFilter!.includes(r.chunk.filePath))
      : results;

    // Apply token budget
    const selected = this.applyTokenBudget(filtered, budget);

    return {
      agentId: query.agentId,
      chunks: selected,
      totalTokens: selected.reduce((sum, r) => sum + r.tokenCount, 0),
      tokenBudget: budget,
      createdAt: Date.now(),
    };
  }

  boostByRank(results: SearchResult[], rankedNodes: RankedNode[]): SearchResult[] {
    const rankMap = new Map(rankedNodes.map((n) => [n.filePath, n.rank]));

    return results.map((result) => {
      const rank = rankMap.get(result.chunk.filePath) ?? 0;
      return {
        ...result,
        score: result.score * (1 + rank * 0.5),
      };
    }).sort((a, b) => b.score - a.score);
  }

  private applyTokenBudget(results: SearchResult[], budget: number): SearchResult[] {
    const selected: SearchResult[] = [];
    let totalTokens = 0;

    for (const result of results) {
      if (totalTokens + result.tokenCount > budget) {
        break;
      }
      selected.push(result);
      totalTokens += result.tokenCount;
    }

    return selected;
  }

  private getBudget(role: RetrievalQuery['agentRole']): number {
    const budgets: Record<RetrievalQuery['agentRole'], number> = {
      coordinator: TOKEN_BUDGETS.COORDINATOR,
      implementor: TOKEN_BUDGETS.IMPLEMENTOR,
      verifier: TOKEN_BUDGETS.VERIFIER,
    };
    return budgets[role];
  }
}
