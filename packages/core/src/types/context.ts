/**
 * Context Engine 타입 정의
 */

export interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  symbols: string[];
  language: string;
  chunkType: 'function' | 'class' | 'module' | 'block' | 'comment';
}

export interface EmbeddedChunk extends CodeChunk {
  embedding: number[];
  embeddedAt: number;
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
  tokenCount: number;
}

export interface ContextWindow {
  agentId: string;
  chunks: SearchResult[];
  totalTokens: number;
  tokenBudget: number;
  createdAt: number;
}

export interface ProjectSummary {
  rootPath: string;
  totalFiles: number;
  totalChunks: number;
  languages: Record<string, number>;
  topSymbols: Array<{ name: string; rank: number; filePath: string }>;
  generatedAt: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'call' | 'inherit' | 'implement';
}

export interface DependencyGraph {
  nodes: string[];
  edges: DependencyEdge[];
}

export interface TrajectoryStep {
  stepIndex: number;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  tokenCount: number;
  timestamp: number;
  isHot: boolean;
}

export interface TrajectorySummary {
  sessionId: string;
  agentId: string;
  phase: string;
  filesModified: string[];
  decisions: string[];
  blockers: string[];
  tokensUsed: number;
  summary: string;
  createdAt: number;
}
