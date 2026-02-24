import type { TrajectoryStep } from '@intent-ide/core';
import { CONTEXT_COMPACTION, TOKEN_BUDGETS } from '@intent-ide/core';

export interface CompactedResult {
  stepId: string;
  isHot: boolean;
  content: string;
  summary?: string;
  tokenCount: number;
  originalTokenCount: number;
}

/**
 * Manus Context Reduction 전략 구현
 * Hot/Cold 2단계 결과 압축
 *
 * Hot: 최근 N개 결과는 전체 내용 유지
 * Cold: 오래된 결과는 요약으로 압축
 */
export class ContextCompactor {
  private steps: Map<string, TrajectoryStep> = new Map();
  private turnCounter = 0;
  private maxHotResults: number;
  private forceColdThreshold: number;

  constructor() {
    this.maxHotResults = CONTEXT_COMPACTION.MAX_HOT_RESULTS;
    this.forceColdThreshold = CONTEXT_COMPACTION.FORCE_COLD_THRESHOLD;
  }

  /**
   * 새 도구 결과 추가 및 Hot/Cold 자동 관리
   */
  addStep(step: TrajectoryStep): void {
    this.steps.set(`step-${step.stepIndex}`, step);
    this.turnCounter++;
    this.autoTransition();
  }

  /**
   * Hot → Cold 자동 전환
   */
  private autoTransition(): void {
    const hotSteps = [...this.steps.values()].filter((s) => s.isHot);

    // 최대 Hot 개수 초과 시 오래된 것부터 Cold로
    if (hotSteps.length > this.maxHotResults) {
      const toTransition = hotSteps
        .sort((a, b) => a.stepIndex - b.stepIndex)
        .slice(0, hotSteps.length - this.maxHotResults);

      for (const step of toTransition) {
        const key = `step-${step.stepIndex}`;
        const existing = this.steps.get(key);
        if (existing) {
          this.steps.set(key, { ...existing, isHot: false });
        }
      }
    }
  }

  /**
   * 컨텍스트 토큰 사용률 체크 및 강제 압축
   */
  compactIfNeeded(budget: number): CompactedResult[] {
    const allSteps = [...this.steps.values()];
    const totalTokens = allSteps.reduce((sum, s) => sum + s.tokenCount, 0);
    const usageRate = totalTokens / budget;

    if (usageRate > this.forceColdThreshold) {
      // 강제 Cold 전환 (가장 오래된 Hot 결과들)
      const hotSteps = allSteps
        .filter((s) => s.isHot)
        .sort((a, b) => a.stepIndex - b.stepIndex);

      const toForce = hotSteps.slice(0, Math.ceil(hotSteps.length / 2));
      for (const step of toForce) {
        const key = `step-${step.stepIndex}`;
        const existing = this.steps.get(key);
        if (existing) {
          this.steps.set(key, { ...existing, isHot: false });
        }
      }
    }

    return this.buildCompactedView();
  }

  /**
   * 에이전트가 특정 step을 참조할 때 Hot으로 승격
   */
  promoteToHot(stepIndex: number): void {
    const key = `step-${stepIndex}`;
    const step = this.steps.get(key);
    if (step) {
      this.steps.set(key, { ...step, isHot: true });
      // 승격으로 인해 maxHot 초과되면 다시 자동 전환
      this.autoTransition();
    }
  }

  private buildCompactedView(): CompactedResult[] {
    return [...this.steps.values()]
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map((step) => {
        if (step.isHot) {
          return {
            stepId: `step-${step.stepIndex}`,
            isHot: true,
            content: JSON.stringify(step.output),
            tokenCount: step.tokenCount,
            originalTokenCount: step.tokenCount,
          };
        }
        // Cold: 요약만
        const summary = this.summarizeStep(step);
        return {
          stepId: `step-${step.stepIndex}`,
          isHot: false,
          content: summary,
          summary,
          tokenCount: Math.ceil(summary.length / 4),
          originalTokenCount: step.tokenCount,
        };
      });
  }

  private summarizeStep(step: TrajectoryStep): string {
    const output = step.output;
    if (typeof output === 'string') {
      const truncated = output.slice(0, TOKEN_BUDGETS.COLD_SUMMARY * 4);
      return `[${step.toolName}] ${truncated}${output.length > TOKEN_BUDGETS.COLD_SUMMARY * 4 ? '...' : ''}`;
    }
    return `[${step.toolName}] ${JSON.stringify(output).slice(0, TOKEN_BUDGETS.COLD_SUMMARY * 4)}`;
  }

  getHotStepCount(): number {
    return [...this.steps.values()].filter((s) => s.isHot).length;
  }

  getTotalTokenCount(): number {
    return [...this.steps.values()].reduce((sum, s) => sum + s.tokenCount, 0);
  }
}
