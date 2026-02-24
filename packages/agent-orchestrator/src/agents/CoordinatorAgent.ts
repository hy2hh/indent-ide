import type { AgentResult, SpecTask, StreamChunk } from '@intent-ide/core';
import { BaseAgent } from './BaseAgent.js';
import type { BaseAgentOptions } from './BaseAgent.js';
import type { LivingSpec } from '../spec/LivingSpec.js';
import type { PromptBuilder } from '@intent-ide/llm-orchestrator';
import type { ModelRouter } from '@intent-ide/llm-orchestrator';
import type { ContextWindowManager } from '@intent-ide/context-engine';
import { StreamParser } from '@intent-ide/llm-orchestrator';
import type { CoordinatorOutput } from '../communication/OutputSchema.js';
import { VERIFIER_OUTPUT_SCHEMA } from '../communication/OutputSchema.js';

export interface CoordinatorAgentOptions extends BaseAgentOptions {
  promptBuilder: PromptBuilder;
  modelRouter: ModelRouter;
  contextWindowManager: ContextWindowManager;
}

/**
 * Coordinator Agent - 기획/분해/명세 작성
 * Living Spec을 작성하고 서브태스크로 분해
 */
export class CoordinatorAgent extends BaseAgent {
  private promptBuilder: PromptBuilder;
  private modelRouter: ModelRouter;
  private contextWindowManager: ContextWindowManager;

  constructor(options: CoordinatorAgentOptions) {
    super(options);
    this.promptBuilder = options.promptBuilder;
    this.modelRouter = options.modelRouter;
    this.contextWindowManager = options.contextWindowManager;
  }

  async execute(spec: LivingSpec, _taskId?: string): Promise<AgentResult> {
    this.setStatus('running');

    try {
      const specData = spec.getData();
      this.setProgress(10);

      // Build context window
      const contextWindow = await this.contextWindowManager.buildWindow(
        { agentId: this.id, role: 'coordinator' },
        specData.goal,
        specData
      );
      this.setProgress(30);

      // Build prompt
      const prompt = this.promptBuilder.build({
        role: 'coordinator',
        goal: specData.goal,
        spec: specData,
        contextWindow,
        outputSchema: VERIFIER_OUTPUT_SCHEMA,
      });
      this.setProgress(40);

      // Execute CLI with streaming — publish progress chunks via messageBus
      const cli = this.modelRouter.route('coordinator');
      const flags = this.modelRouter.getFlags('coordinator');

      const stream = cli.stream(prompt.user, { flags, outputFormat: 'stream-json' });

      let fullContent = '';
      for await (const chunk of stream as AsyncIterable<StreamChunk>) {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
          this.messageBus.publish(
            'agent:progress',
            this.createMessage('status', {
              role: this.role,
              content: chunk.content,
              accumulated: fullContent.slice(-500), // 최근 500자
            })
          );
        }
      }
      this.setProgress(80);

      // Parse coordinator output from accumulated full content
      const streamParser = new StreamParser();
      streamParser.process({ type: 'text', content: fullContent });
      const parsed = streamParser.process({ type: 'done', content: '' });

      const output = this.parseCoordinatorOutput(parsed.jsonBlocks, specData.goal);

      // Update Living Spec with tasks
      for (const task of output.tasks) {
        const specTask: SpecTask = {
          id: task.id,
          description: task.description,
          status: 'pending',
          priority: task.priority,
          dependencies: output.dependencies[task.id] ?? [],
          files: task.targetFiles,
          discoveries: [],
          feedback: [],
        };
        spec.addTask(specTask, this.id);
      }

      this.reportDiscovery(`${output.tasks.length}개 서브태스크로 분해`, spec);
      this.setStatus('completed');
      this.setProgress(100);

      return {
        agentId: this.id,
        taskId: 'coordinator',
        filesCreated: [],
        filesModified: [],
        dependencies: [],
        decisions: [`${output.tasks.length}개 태스크로 분해`],
        discoveries: this.state.discoveries,
        testsPassed: true,
        summary: `목표를 ${output.tasks.length}개 서브태스크로 분해 완료`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus('failed', message);
      throw err;
    }
  }

  private parseCoordinatorOutput(
    jsonBlocks: unknown[],
    goal: string
  ): CoordinatorOutput {
    for (const block of jsonBlocks) {
      if (
        block &&
        typeof block === 'object' &&
        'tasks' in block &&
        Array.isArray((block as CoordinatorOutput).tasks)
      ) {
        return block as CoordinatorOutput;
      }
    }

    // Fallback: single task
    return {
      specId: `spec-${Date.now()}`,
      goal,
      tasks: [
        {
          id: 'task-1',
          description: goal,
          targetFiles: [],
          requiredContext: [],
          expectedOutputs: [],
          priority: 'high',
        },
      ],
      constraints: [],
      dependencies: {},
      waveOrder: [['task-1']],
    };
  }
}
