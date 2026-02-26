import type { AgentResult } from '@intent-ide/core';
import { BaseAgent } from './BaseAgent.js';
import type { BaseAgentOptions } from './BaseAgent.js';
import type { LivingSpec } from '../spec/LivingSpec.js';
import type { PromptBuilder, ModelRouter } from '@intent-ide/llm-orchestrator';
import { StreamParser as StreamParserImpl } from '@intent-ide/llm-orchestrator';
import type { ContextWindowManager } from '@intent-ide/context-engine';
import type { WorktreeManager } from '../workspace/WorktreeManager.js';
import type { ImplementorOutput } from '../communication/OutputSchema.js';
import { IMPLEMENTOR_OUTPUT_SCHEMA } from '../communication/OutputSchema.js';

export interface ImplementorAgentOptions extends BaseAgentOptions {
  promptBuilder: PromptBuilder;
  modelRouter: ModelRouter;
  contextWindowManager: ContextWindowManager;
  worktreeManager: WorktreeManager;
  taskId: string;
  allowedFilePaths?: string[];
}

/**
 * Implementor Agent - 코드 구현
 * 할당된 Task를 Git Worktree 내에서 구현
 */
export class ImplementorAgent extends BaseAgent {
  private promptBuilder: PromptBuilder;
  private modelRouter: ModelRouter;
  private contextWindowManager: ContextWindowManager;
  private worktreeManager: WorktreeManager;
  private assignedTaskId: string;
  private allowedFilePaths: string[] | undefined;

  constructor(options: ImplementorAgentOptions) {
    super(options);
    this.promptBuilder = options.promptBuilder;
    this.modelRouter = options.modelRouter;
    this.contextWindowManager = options.contextWindowManager;
    this.worktreeManager = options.worktreeManager;
    this.assignedTaskId = options.taskId;
    this.allowedFilePaths = options.allowedFilePaths;
  }

  async execute(spec: LivingSpec, taskId?: string): Promise<AgentResult> {
    const targetTaskId = taskId ?? this.assignedTaskId;
    this.state.currentTaskId = targetTaskId;

    this.setStatus('running');

    try {
      const specData = spec.getData();
      const task = spec.getTask(targetTaskId);
      if (!task) {
        throw new Error(`Task '${targetTaskId}'를 Spec에서 찾을 수 없습니다.`);
      }

      // Update task status
      spec.updateTaskStatus(targetTaskId, 'in_progress', this.id);
      this.setProgress(10);

      // Create Git worktree
      const worktreePath = await this.worktreeManager.create(this.id);
      this.state = { ...this.state };
      this.setProgress(20);

      // Build context window (task-specific files only)
      const contextWindow = await this.contextWindowManager.buildWindow(
        {
          agentId: this.id,
          role: 'implementor',
          taskId: targetTaskId,
          allowedFilePaths: this.allowedFilePaths ?? task.files,
        },
        `${task.description}\n${task.files.join('\n')}`,
        specData
      );
      this.setProgress(40);

      // Build prompt
      const prompt = this.promptBuilder.build({
        role: 'implementor',
        goal: task.description,
        spec: specData,
        contextWindow,
        taskId: targetTaskId,
        outputSchema: IMPLEMENTOR_OUTPUT_SCHEMA,
      });
      this.setProgress(50);

      // Execute CLI in worktree
      const cli = this.modelRouter.route('implementor');
      const flags = this.modelRouter.getFlags('implementor');

      const streamParser = new StreamParserImpl();
      const stream = cli.stream(prompt.user, {
        flags,
        workingDir: worktreePath,
        outputFormat: 'stream-json',
      });
      const result = await streamParser.collectAll(stream);
      this.setProgress(80);

      // Parse output
      const output = this.parseImplementorOutput(result.jsonBlocks, task.description);

      // Report discoveries back to spec
      for (const discovery of output.discoveries) {
        this.reportDiscovery(discovery, spec, targetTaskId);
      }

      // Update spec with created/modified files
      spec.setTaskFiles(
        targetTaskId,
        [...output.filesCreated, ...output.filesModified],
        this.id
      );

      spec.updateTaskStatus(targetTaskId, 'completed', this.id);
      this.setStatus('completed');
      this.setProgress(100);

      return {
        agentId: this.id,
        taskId: targetTaskId,
        filesCreated: output.filesCreated,
        filesModified: output.filesModified,
        dependencies: output.dependencies,
        decisions: output.decisions,
        discoveries: output.discoveries,
        testsPassed: output.testsPassed,
        summary: output.summary,
        worktreePath,
      };
    } catch (err) {
      spec.updateTaskStatus(targetTaskId, 'failed', this.id);
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus('failed', message);
      throw err;
    }
  }

  private parseImplementorOutput(
    jsonBlocks: unknown[],
    taskDescription: string
  ): ImplementorOutput {
    for (const block of jsonBlocks) {
      if (
        block &&
        typeof block === 'object' &&
        'filesCreated' in block
      ) {
        return block as ImplementorOutput;
      }
    }

    return {
      filesCreated: [],
      filesModified: [],
      dependencies: [],
      decisions: [],
      discoveries: [],
      testsPassed: false,
      summary: `${taskDescription} 구현 시도`,
    };
  }
}
