import type { CliOptions, CliResponse, StreamChunk } from '@intent-ide/core';
import type { CliProvider } from './CliProvider.js';
import { CliProcessManager, commandExists } from './CliProcessManager.js';

/**
 * Gemini CLI 래퍼
 * gemini "프롬프트"
 */
export class GeminiCli implements CliProvider {
  readonly name = 'gemini';
  readonly command = 'gemini';
  private processManager: CliProcessManager;

  constructor(processManager?: CliProcessManager) {
    this.processManager = processManager ?? new CliProcessManager();
  }

  async execute(prompt: string, options: CliOptions = {}): Promise<CliResponse> {
    const args = this.buildArgs(prompt, options);
    const processId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return this.processManager.execute(processId, this.command, args, options);
  }

  async *stream(prompt: string, options: CliOptions = {}): AsyncIterable<StreamChunk> {
    const args = this.buildArgs(prompt, options);
    const processId = `gemini-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    yield* this.processManager.stream(processId, this.command, args, options);
  }

  async isAvailable(): Promise<boolean> {
    return commandExists(this.command);
  }

  private buildArgs(prompt: string, options: CliOptions): string[] {
    const args = [prompt];
    if (options.flags) {
      args.push(...options.flags);
    }
    return args;
  }
}
