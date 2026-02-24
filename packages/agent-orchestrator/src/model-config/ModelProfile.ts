import type { AgentRole, CliModelProfile } from '@intent-ide/core';
import { DEFAULT_CLI_PROFILES } from '@intent-ide/core';

export interface ModelProfileConfig {
  profiles: Record<AgentRole, CliModelProfile>;
  allowOverride: boolean;
}

/**
 * 역할별 모델 프로필 설정 관리
 */
export class ModelProfile {
  private profiles: Record<AgentRole, CliModelProfile>;

  constructor(customProfiles?: Partial<Record<AgentRole, CliModelProfile>>) {
    this.profiles = {
      coordinator: DEFAULT_CLI_PROFILES['coordinator']!,
      implementor: DEFAULT_CLI_PROFILES['implementor']!,
      verifier: DEFAULT_CLI_PROFILES['verifier']!,
      ...customProfiles,
    };
  }

  get(role: AgentRole): CliModelProfile {
    return this.profiles[role];
  }

  set(role: AgentRole, profile: CliModelProfile): void {
    this.profiles[role] = profile;
  }

  getAll(): Record<AgentRole, CliModelProfile> {
    return { ...this.profiles };
  }

  toJSON(): Record<string, unknown> {
    return this.profiles;
  }
}
