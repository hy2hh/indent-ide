import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { TrajectoryStep, TrajectorySummary } from '@intent-ide/core';

export interface TrajectoryStoreOptions {
  basePath: string;
  sessionId: string;
}

/**
 * Manus Context Offloading 전략 구현
 * 도구 결과를 컨텍스트에 누적하지 않고 파일시스템에 저장
 *
 * .intent-ide/trajectories/session-{timestamp}/agent-id/step-{n}.json
 */
export class TrajectoryStore {
  private basePath: string;
  private sessionId: string;

  constructor(options: TrajectoryStoreOptions) {
    this.basePath = options.basePath;
    this.sessionId = options.sessionId;
  }

  private getAgentPath(agentId: string): string {
    return join(
      this.basePath,
      'trajectories',
      `session-${this.sessionId}`,
      agentId
    );
  }

  async saveStep(agentId: string, step: TrajectoryStep): Promise<string> {
    const agentPath = this.getAgentPath(agentId);
    await mkdir(agentPath, { recursive: true });

    const fileName = `step-${String(step.stepIndex).padStart(3, '0')}.json`;
    const filePath = join(agentPath, fileName);

    await writeFile(filePath, JSON.stringify(step, null, 2), 'utf-8');
    return filePath;
  }

  async loadStep(agentId: string, stepIndex: number): Promise<TrajectoryStep | null> {
    const agentPath = this.getAgentPath(agentId);
    const fileName = `step-${String(stepIndex).padStart(3, '0')}.json`;
    const filePath = join(agentPath, fileName);

    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data) as TrajectoryStep;
    } catch {
      return null;
    }
  }

  async loadAllSteps(agentId: string): Promise<TrajectoryStep[]> {
    const agentPath = this.getAgentPath(agentId);

    let files: string[];
    try {
      files = await readdir(agentPath);
    } catch {
      return [];
    }

    const steps: TrajectoryStep[] = [];
    for (const file of files.sort()) {
      if (file.startsWith('step-') && file.endsWith('.json')) {
        try {
          const data = await readFile(join(agentPath, file), 'utf-8');
          steps.push(JSON.parse(data) as TrajectoryStep);
        } catch {
          // Skip corrupted files
        }
      }
    }

    return steps;
  }

  async saveSummary(agentId: string, summary: TrajectorySummary): Promise<void> {
    const agentPath = this.getAgentPath(agentId);
    await mkdir(agentPath, { recursive: true });
    await writeFile(
      join(agentPath, 'summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8'
    );
  }

  async loadSummary(agentId: string): Promise<TrajectorySummary | null> {
    const agentPath = this.getAgentPath(agentId);
    try {
      const data = await readFile(join(agentPath, 'summary.json'), 'utf-8');
      return JSON.parse(data) as TrajectorySummary;
    } catch {
      return null;
    }
  }

  async getStepCount(agentId: string): Promise<number> {
    const agentPath = this.getAgentPath(agentId);
    try {
      const files = await readdir(agentPath);
      return files.filter((f) => f.startsWith('step-') && f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }
}
