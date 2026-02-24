/**
 * LLM 프로바이더, 모델 설정 타입 정의
 */

export type CliProviderName = 'claude-code' | 'codex' | 'gemini';

export interface CliOptions {
  model?: string;
  flags?: string[];
  timeoutMs?: number;
  outputFormat?: 'json' | 'stream-json' | 'text';
  workingDir?: string;
}

export interface CliResponse {
  content: string;
  rawOutput: string;
  exitCode: number;
  tokensUsed?: number;
  durationMs: number;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PromptTemplate {
  system: string;
  user: string;
  variables: Record<string, string>;
}

export interface ModelConfig {
  provider: CliProviderName;
  model?: string;
  flags?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}
