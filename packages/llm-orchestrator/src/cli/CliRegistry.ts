import type { CliProvider } from './CliProvider.js';
import { ClaudeCodeCli } from './ClaudeCodeCli.js';
import { CodexCli } from './CodexCli.js';
import { GeminiCli } from './GeminiCli.js';
import { CliProcessManager } from './CliProcessManager.js';

/**
 * CLI 프로바이더 등록/관리 + 설치 여부 자동 감지
 */
export class CliRegistry {
  private providers = new Map<string, CliProvider>();
  private availabilityCache = new Map<string, boolean>();
  private processManager: CliProcessManager;

  constructor() {
    this.processManager = new CliProcessManager();
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new ClaudeCodeCli(this.processManager));
    this.register(new CodexCli(this.processManager));
    this.register(new GeminiCli(this.processManager));
  }

  register(provider: CliProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): CliProvider | undefined {
    return this.providers.get(name);
  }

  getOrThrow(name: string): CliProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`CLI 프로바이더 '${name}'을 찾을 수 없습니다.`);
    }
    return provider;
  }

  /**
   * 모든 등록된 CLI의 설치 여부 감지
   */
  async detectInstalled(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      [...this.providers.entries()].map(async ([name, provider]) => {
        const available = await provider.isAvailable();
        results.set(name, available);
        this.availabilityCache.set(name, available);
      })
    );

    return results;
  }

  /**
   * 설치된 CLI 목록 반환 (캐시 기반)
   */
  getAvailableProviders(): string[] {
    return [...this.availabilityCache.entries()]
      .filter(([, available]) => available)
      .map(([name]) => name);
  }

  isAvailable(name: string): boolean {
    return this.availabilityCache.get(name) ?? false;
  }

  /**
   * 우선순위에 따라 대체 CLI 찾기
   */
  findFallback(
    preferred: string,
    fallbackOrder = ['claude-code', 'codex', 'gemini']
  ): CliProvider | undefined {
    if (this.isAvailable(preferred)) {
      return this.providers.get(preferred);
    }

    for (const name of fallbackOrder) {
      if (name !== preferred && this.isAvailable(name)) {
        return this.providers.get(name);
      }
    }

    return undefined;
  }

  listAll(): string[] {
    return [...this.providers.keys()];
  }
}
