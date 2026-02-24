/**
 * 에이전트 역할, 상태, 메시지 타입 정의
 */

export type AgentRole = 'coordinator' | 'implementor' | 'verifier';

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentConfig {
  id: string;
  role: AgentRole;
  cliProfile: CliModelProfile;
  worktreePath?: string;
  maxRetries: number;
  timeoutMs: number;
}

export interface CliModelProfile {
  role: AgentRole;
  cli: 'claude-code' | 'codex' | 'gemini' | string;
  flags?: string[];
  purpose: string;
}

export interface AgentState {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentTaskId?: string;
  progress: number;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  discoveries: string[];
}

export interface AgentMessage {
  id: string;
  from: string;
  to: 'broadcast' | string;
  type: 'discovery' | 'status' | 'request' | 'feedback' | 'result';
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface AgentResult {
  agentId: string;
  taskId: string;
  filesCreated: string[];
  filesModified: string[];
  dependencies: string[];
  decisions: string[];
  discoveries: string[];
  testsPassed: boolean;
  summary: string;
  worktreePath?: string;
}
