/**
 * 모델 ID 및 역할별 기본 모델 매핑
 */
import type { CliModelProfile } from '../types/agent.js';

export const CLAUDE_MODELS = {
  OPUS: 'claude-opus-4-5',
  SONNET: 'claude-sonnet-4-5',
  HAIKU: 'claude-haiku-4-5',
} as const;

export const DEFAULT_CLI_PROFILES: Record<string, CliModelProfile> = {
  coordinator: {
    role: 'coordinator',
    cli: 'claude-code',
    flags: ['--model', CLAUDE_MODELS.OPUS],
    purpose: '작업 분석, Spec 작성, 서브태스크 분해',
  },
  implementor: {
    role: 'implementor',
    cli: 'claude-code',
    flags: ['--model', CLAUDE_MODELS.SONNET],
    purpose: '코드 구현, 파일 수정',
  },
  verifier: {
    role: 'verifier',
    cli: 'codex',
    flags: [],
    purpose: 'Spec 대비 구현 검증, 역번역 검증',
  },
};

export const AVAILABLE_CLI_PROVIDERS = ['claude-code', 'codex', 'gemini'] as const;
