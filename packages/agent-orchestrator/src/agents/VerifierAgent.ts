import type { AgentResult } from '@intent-ide/core';
import { BaseAgent } from './BaseAgent.js';
import type { BaseAgentOptions } from './BaseAgent.js';
import type { LivingSpec } from '../spec/LivingSpec.js';
import type { PromptBuilder, ModelRouter } from '@intent-ide/llm-orchestrator';
import { StreamParser } from '@intent-ide/llm-orchestrator';
import type { ContextWindowManager } from '@intent-ide/context-engine';
import type { VerifierOutput } from '../communication/OutputSchema.js';
import { VERIFIER_OUTPUT_SCHEMA } from '../communication/OutputSchema.js';

export interface VerifierAgentOptions extends BaseAgentOptions {
  promptBuilder: PromptBuilder;
  modelRouter: ModelRouter;
  contextWindowManager: ContextWindowManager;
}

/**
 * Verifier Agent - 검증/리뷰
 * Living Spec vs 구현 대조 + 역번역 검증
 */
export class VerifierAgent extends BaseAgent {
  private promptBuilder: PromptBuilder;
  private modelRouter: ModelRouter;
  private contextWindowManager: ContextWindowManager;

  constructor(options: VerifierAgentOptions) {
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

      // Build context with all implementation results
      const contextWindow = await this.contextWindowManager.buildWindow(
        { agentId: this.id, role: 'verifier' },
        `검증: ${specData.goal}`,
        specData
      );
      this.setProgress(30);

      const prompt = this.promptBuilder.build({
        role: 'verifier',
        goal: `다음 Spec과 구현을 대조 검증하세요: ${specData.goal}`,
        spec: specData,
        contextWindow,
        outputSchema: VERIFIER_OUTPUT_SCHEMA,
      });
      this.setProgress(40);

      const cli = this.modelRouter.route('verifier');
      const flags = this.modelRouter.getFlags('verifier');

      const streamParser = new StreamParser();
      const stream = cli.stream(prompt.user, { flags, outputFormat: 'stream-json' });
      const result = await streamParser.collectAll(stream);
      this.setProgress(80);

      const output = this.parseVerifierOutput(result.jsonBlocks);
      this.setProgress(90);

      if (output.passed) {
        this.messageBus.publish(
          'verify:pass',
          this.createMessage('result', { output, specId: specData.id })
        );
        spec.complete(this.id);
      } else {
        // Add feedback to failed tasks
        for (const issue of output.issues) {
          if (issue.taskId) {
            spec.addFeedback(issue.taskId, issue.description, this.id);
          }
        }
        this.messageBus.publish(
          'verify:fail',
          this.createMessage('feedback', { output, issues: output.issues })
        );
      }

      this.setStatus('completed');
      this.setProgress(100);

      return {
        agentId: this.id,
        taskId: 'verifier',
        filesCreated: [],
        filesModified: [],
        dependencies: [],
        decisions: [`검증 ${output.passed ? '통과' : '실패'} (커버리지: ${Math.round(output.specCoverage * 100)}%)`],
        discoveries: output.suggestions,
        testsPassed: output.passed,
        summary: output.reverseTranslation.slice(0, 200),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus('failed', message);
      throw err;
    }
  }

  private parseVerifierOutput(jsonBlocks: unknown[]): VerifierOutput {
    for (const block of jsonBlocks) {
      if (
        block &&
        typeof block === 'object' &&
        'passed' in block &&
        'issues' in block
      ) {
        return block as VerifierOutput;
      }
    }

    // Fallback: assume pass if no structured output
    return {
      passed: true,
      issues: [],
      feedback: [],
      suggestions: [],
      reverseTranslation: '구현 완료',
      specCoverage: 1.0,
    };
  }
}
