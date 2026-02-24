import type { ContextWindow, AgentRole, LivingSpecData } from '@intent-ide/core';
import { TOKEN_BUDGETS } from '@intent-ide/core';
import type { ContextRetriever, RetrievalQuery } from '../retriever/ContextRetriever.js';
import { ContextCompactor } from './ContextCompactor.js';

/**
 * Manus Context Isolation 전략 구현
 * 각 에이전트에 격리된 컨텍스트 윈도우 할당
 *
 * - Coordinator: Living Spec + 프로젝트 구조 + 전체 검색 결과
 * - Implementor: 담당 Task + 관련 파일 + 해당 워크트리 상태
 * - Verifier: Living Spec + 모든 구현 결과 + 프로젝트 규칙
 */
export interface AgentContextConfig {
  agentId: string;
  role: AgentRole;
  taskId?: string;
  allowedFilePaths?: string[];
}

export class ContextWindowManager {
  private windows = new Map<string, ContextWindow>();
  private compactors = new Map<string, ContextCompactor>();
  private retriever: ContextRetriever;

  constructor(retriever: ContextRetriever) {
    this.retriever = retriever;
  }

  async buildWindow(
    config: AgentContextConfig,
    query: string,
    spec?: LivingSpecData
  ): Promise<ContextWindow> {
    const existingCompactor = this.compactors.get(config.agentId) ?? new ContextCompactor();
    this.compactors.set(config.agentId, existingCompactor);

    const retrievalQuery: RetrievalQuery = {
      query,
      agentId: config.agentId,
      agentRole: config.role,
      topK: this.getTopK(config.role),
      ...(config.allowedFilePaths !== undefined ? { fileFilter: config.allowedFilePaths } : {}),
    };

    const window = await this.retriever.retrieve(retrievalQuery);

    // Inject Living Spec context for coordinator and verifier
    if (spec && (config.role === 'coordinator' || config.role === 'verifier')) {
      const specChunk = this.specToChunk(spec);
      window.chunks.unshift(specChunk);
      window.totalTokens += specChunk.tokenCount;
    }

    // Apply compaction if needed
    const budget = this.getBudget(config.role);
    existingCompactor.compactIfNeeded(budget);

    this.windows.set(config.agentId, window);
    return window;
  }

  getWindow(agentId: string): ContextWindow | undefined {
    return this.windows.get(agentId);
  }

  clearWindow(agentId: string): void {
    this.windows.delete(agentId);
    this.compactors.delete(agentId);
  }

  private specToChunk(spec: LivingSpecData) {
    const specText = JSON.stringify(spec, null, 2);
    return {
      chunk: {
        id: `spec-${spec.id}`,
        filePath: '.intent-ide/spec.json',
        content: specText,
        startLine: 1,
        endLine: specText.split('\n').length,
        symbols: ['LivingSpec'],
        language: 'json',
        chunkType: 'module' as const,
      },
      score: 1.0,
      tokenCount: Math.ceil(specText.length / 4),
    };
  }

  private getTopK(role: AgentRole): number {
    const topKMap: Record<AgentRole, number> = {
      coordinator: 15,
      implementor: 8,
      verifier: 12,
    };
    return topKMap[role];
  }

  private getBudget(role: AgentRole): number {
    const budgets: Record<AgentRole, number> = {
      coordinator: TOKEN_BUDGETS.COORDINATOR,
      implementor: TOKEN_BUDGETS.IMPLEMENTOR,
      verifier: TOKEN_BUDGETS.VERIFIER,
    };
    return budgets[role];
  }
}
