import type { CliOptions, CliResponse, StreamChunk } from '@intent-ide/core';
import type { CliProvider } from './CliProvider.js';
import { CliProcessManager, commandExists } from './CliProcessManager.js';

/**
 * Claude Code CLI 래퍼
 * claude -p "프롬프트" --model sonnet --output-format json
 */
export class ClaudeCodeCli implements CliProvider {
  readonly name = 'claude-code';
  readonly command = 'claude';
  private processManager: CliProcessManager;

  constructor(processManager?: CliProcessManager) {
    this.processManager = processManager ?? new CliProcessManager();
  }

  async execute(prompt: string, options: CliOptions = {}): Promise<CliResponse> {
    const args = this.buildArgs(prompt, options);
    const processId = `claude-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await this.processManager.execute(
      processId,
      this.command,
      args,
      options
    );

    return {
      ...response,
      content: this.parseOutput(response.content, options.outputFormat),
    };
  }

  async *stream(prompt: string, options: CliOptions = {}): AsyncIterable<StreamChunk> {
    const streamOptions: CliOptions = {
      ...options,
      outputFormat: 'stream-json',
    };
    const args = this.buildArgs(prompt, streamOptions);
    const processId = `claude-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    yield* this.processManager.stream(processId, this.command, args, streamOptions);
  }

  async isAvailable(): Promise<boolean> {
    return commandExists(this.command);
  }

  private buildArgs(prompt: string, options: CliOptions): string[] {
    const args = ['-p', prompt];

    if (options.model) {
      args.push('--model', options.model);
    }

    const outputFormat = options.outputFormat ?? 'json';
    args.push('--output-format', outputFormat);

    if (options.flags) {
      args.push(...options.flags);
    }

    return args;
  }

  private parseOutput(output: string, format?: string): string {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(output) as { result?: string; content?: string };
        return parsed.result ?? parsed.content ?? output;
      } catch {
        return output;
      }
    }
    return output;
  }
}
