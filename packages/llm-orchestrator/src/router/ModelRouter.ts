import type { AgentRole, CliModelProfile } from '@intent-ide/core';
import { DEFAULT_CLI_PROFILES } from '@intent-ide/core';
import type { CliRegistry } from '../cli/CliRegistry.js';
import type { CliProvider } from '../cli/CliProvider.js';

/**
 * 에이전트 역할 → CLI 프로바이더 매핑
 */
export class ModelRouter {
  private registry: CliRegistry;
  private profiles: Record<string, CliModelProfile>;

  constructor(registry: CliRegistry, customProfiles?: Record<string, CliModelProfile>) {
    this.registry = registry;
    this.profiles = { ...DEFAULT_CLI_PROFILES, ...customProfiles };
  }

  /**
   * 역할에 맞는 CLI 프로바이더 반환
   */
  route(role: AgentRole): CliProvider {
    const profile = this.profiles[role];
    if (!profile) {
      throw new Error(`역할 '${role}'에 대한 CLI 프로필이 없습니다.`);
    }

    // 지정된 CLI 사용 가능 여부 확인
    if (this.registry.isAvailable(profile.cli)) {
      return this.registry.getOrThrow(profile.cli);
    }

    // 폴백
    const fallback = this.registry.findFallback(profile.cli);
    if (!fallback) {
      throw new Error(
        `역할 '${role}'에 적합한 CLI를 찾을 수 없습니다. ` +
        '\'claude\', \'codex\', \'gemini\' 중 하나를 설치해 주세요.'
      );
    }

    return fallback;
  }

  getProfile(role: AgentRole): CliModelProfile | undefined {
    return this.profiles[role];
  }

  updateProfile(role: AgentRole, profile: CliModelProfile): void {
    this.profiles[role] = profile;
  }

  getFlags(role: AgentRole): string[] {
    return this.profiles[role]?.flags ?? [];
  }
}
