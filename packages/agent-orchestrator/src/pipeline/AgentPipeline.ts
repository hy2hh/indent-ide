import type { AgentResult } from '@intent-ide/core';
import { LivingSpec } from '../spec/LivingSpec.js';
import type { CoordinatorAgent } from '../agents/CoordinatorAgent.js';
import type { ImplementorAgent } from '../agents/ImplementorAgent.js';
import type { VerifierAgent } from '../agents/VerifierAgent.js';
import type { MessageBus } from '../communication/MessageBus.js';
import { createAgentMessage } from '../communication/MessageBus.js';
import { TaskDecomposer } from './TaskDecomposer.js';
import type { WorktreeManager } from '../workspace/WorktreeManager.js';

export interface PipelineOptions {
  coordinator: CoordinatorAgent;
  verifier: VerifierAgent;
  worktreeManager: WorktreeManager;
  messageBus: MessageBus;
  maxRetries?: number;
  createImplementor: (taskId: string) => ImplementorAgent;
  onSpecCreated?: (spec: LivingSpec) => void;
}

export interface PipelineResult {
  success: boolean;
  spec: LivingSpec;
  results: AgentResult[];
  verifierResult?: AgentResult;
  durationMs: number;
  retries: number;
}

/**
 * Coordinator → Implementor(s) → Verifier 파이프라인 핵심 오케스트레이터
 */
export class AgentPipeline {
  private options: PipelineOptions;
  private decomposer = new TaskDecomposer();

  constructor(options: PipelineOptions) {
    this.options = options;
  }

  async run(
    sessionId: string,
    goal: string,
    context: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const maxRetries = this.options.maxRetries ?? 2;
    let retries = 0;

    const spec = LivingSpec.create(sessionId, goal, context);

    this.options.messageBus.publish(
      'pipeline:started',
      createAgentMessage('pipeline', 'broadcast', 'status', { sessionId, goal })
    );

    try {
      // Phase 1: Coordinate
      await this.options.coordinator.execute(spec);

      // Coordinator 완료 후 spec을 외부에 노출 (Approve UI용)
      this.options.onSpecCreated?.(spec);

      // Wait for user approval — UI에서 agent:approveSpec IPC 호출 시 resolve
      await this.waitForApproval(spec);

      spec.startExecution('pipeline');

      let success = false;
      const allResults: AgentResult[] = [];
      let verifierResult: AgentResult | undefined;

      while (!success && retries <= maxRetries) {
        if (retries > 0) {
          // Reset failed tasks for retry
          this.resetFailedTasks(spec);
        }

        // Phase 2: Implement (wave-based parallel execution)
        const implResults = await this.runImplementors(spec);
        allResults.push(...implResults);

        // Phase 3: Verify
        verifierResult = await this.options.verifier.execute(spec);
        allResults.push(verifierResult);

        if (verifierResult.testsPassed) {
          success = true;
          await this.mergeWorktrees(allResults);
        } else {
          retries++;
        }
      }

      this.options.messageBus.publish(
        success ? 'pipeline:completed' : 'pipeline:failed',
        createAgentMessage('pipeline', 'broadcast', 'result', {
          success,
          retries,
          durationMs: Date.now() - startTime,
        })
      );

      return {
        success,
        spec,
        results: allResults,
        ...(verifierResult !== undefined ? { verifierResult } : {}),
        durationMs: Date.now() - startTime,
        retries,
      };
    } catch (err) {
      this.options.messageBus.publish(
        'pipeline:failed',
        createAgentMessage('pipeline', 'broadcast', 'status', {
          error: err instanceof Error ? err.message : String(err),
        })
      );
      throw err;
    }
  }

  private async waitForApproval(spec: LivingSpec): Promise<void> {
    if (spec.isApproved()) {
      return;
    }

    return new Promise((resolve) => {
      const handleUpdate = () => {
        if (spec.isApproved()) {
          spec.off('spec:updated', handleUpdate);
          resolve();
        }
      };
      spec.on('spec:updated', handleUpdate);
    });
  }

  private async runImplementors(spec: LivingSpec): Promise<AgentResult[]> {
    const specData = spec.getData();
    const waves = this.decomposer.buildWaves(specData.tasks);
    const results: AgentResult[] = [];

    for (const wave of waves) {
      // Run wave tasks in parallel
      const waveResults = await Promise.all(
        wave.taskIds.map(async (taskId) => {
          const implementor = this.options.createImplementor(taskId);
          return implementor.execute(spec, taskId);
        })
      );
      results.push(...waveResults);
    }

    return results;
  }

  private async mergeWorktrees(results: AgentResult[]): Promise<void> {
    for (const result of results) {
      if (result.worktreePath) {
        try {
          await this.options.worktreeManager.merge(result.agentId);
          await this.options.worktreeManager.cleanup(result.agentId);
        } catch {
          // Best effort merge
        }
      }
    }
  }

  private resetFailedTasks(spec: LivingSpec): void {
    const specData = spec.getData();
    for (const task of specData.tasks) {
      if (task.status === 'failed') {
        spec.updateTaskStatus(task.id, 'pending', 'pipeline');
      }
    }
  }
}
