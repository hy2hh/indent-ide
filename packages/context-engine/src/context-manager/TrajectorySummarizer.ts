import type { TrajectoryStep, TrajectorySummary } from '@intent-ide/core';

/**
 * Manus 스키마 기반 궤적 요약
 * 50회 도구 호출 → ~200 토큰 구조화 요약
 */
export class TrajectorySummarizer {
  summarize(
    sessionId: string,
    agentId: string,
    phase: string,
    steps: TrajectoryStep[]
  ): TrajectorySummary {
    const filesModified = this.extractFilesModified(steps);
    const decisions = this.extractDecisions(steps);
    const blockers = this.extractBlockers(steps);
    const tokensUsed = steps.reduce((sum, s) => sum + s.tokenCount, 0);
    const summary = this.buildNarrativeSummary(steps, filesModified, decisions);

    return {
      sessionId,
      agentId,
      phase,
      filesModified,
      decisions,
      blockers,
      tokensUsed,
      summary,
      createdAt: Date.now(),
    };
  }

  private extractFilesModified(steps: TrajectoryStep[]): string[] {
    const files = new Set<string>();

    for (const step of steps) {
      if (
        step.toolName === 'write_file' ||
        step.toolName === 'edit_file' ||
        step.toolName === 'create_file'
      ) {
        const input = step.input as { filePath?: string; path?: string };
        const path = input.filePath ?? input.path;
        if (path) {
          files.add(path);
        }
      }
    }

    return [...files];
  }

  private extractDecisions(steps: TrajectoryStep[]): string[] {
    const decisions: string[] = [];

    for (const step of steps) {
      if (step.toolName === 'think' || step.toolName === 'reasoning') {
        const output = step.output;
        if (typeof output === 'string' && output.length > 10) {
          decisions.push(output.slice(0, 200));
        }
      }
    }

    return decisions.slice(0, 5); // Max 5 decisions in summary
  }

  private extractBlockers(steps: TrajectoryStep[]): string[] {
    const blockers: string[] = [];

    for (const step of steps) {
      const output = step.output;
      if (typeof output === 'string' && (output.includes('error') || output.includes('Error'))) {
        blockers.push(output.slice(0, 100));
      }
    }

    return blockers.slice(0, 3); // Max 3 blockers
  }

  private buildNarrativeSummary(
    steps: TrajectoryStep[],
    filesModified: string[],
    decisions: string[]
  ): string {
    const parts: string[] = [];

    parts.push(`총 ${steps.length}개 작업 수행.`);

    if (filesModified.length > 0) {
      parts.push(`수정 파일: ${filesModified.slice(0, 3).join(', ')}${filesModified.length > 3 ? ` 외 ${filesModified.length - 3}개` : ''}.`);
    }

    if (decisions.length > 0) {
      parts.push(`주요 결정: ${decisions[0]?.slice(0, 100) ?? ''}.`);
    }

    return parts.join(' ');
  }
}
