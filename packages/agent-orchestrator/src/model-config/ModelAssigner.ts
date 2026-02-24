import type { AgentRole, CliModelProfile } from '@intent-ide/core';
import type { ModelProfile } from './ModelProfile.js';
import type { CliRegistry } from '@intent-ide/llm-orchestrator';

/**
 * 에이전트 역할에 최적화된 CLI + 모델 자동 배정
 */
export class ModelAssigner {
  private profile: ModelProfile;
  private registry: CliRegistry;

  constructor(profile: ModelProfile, registry: CliRegistry) {
    this.profile = profile;
    this.registry = registry;
  }

  assign(role: AgentRole): CliModelProfile {
    const profileConfig = this.profile.get(role);

    // Check if assigned CLI is available
    if (this.registry.isAvailable(profileConfig.cli)) {
      return profileConfig;
    }

    // Find available fallback
    const availableProviders = this.registry.getAvailableProviders();
    if (availableProviders.length === 0) {
      throw new Error(
        '설치된 CLI 도구가 없습니다. claude, codex, 또는 gemini를 설치해 주세요.'
      );
    }

    const fallbackCli = availableProviders[0]!;
    return {
      ...profileConfig,
      cli: fallbackCli,
      purpose: `${profileConfig.purpose} (폴백: ${fallbackCli})`,
    };
  }

  getSummary(): Record<string, string> {
    const roles: AgentRole[] = ['coordinator', 'implementor', 'verifier'];
    const summary: Record<string, string> = {};

    for (const role of roles) {
      const assigned = this.assign(role);
      summary[role] = `${assigned.cli} ${assigned.flags?.join(' ') ?? ''}`.trim();
    }

    return summary;
  }
}
