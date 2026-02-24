/**
 * Diff 관련 타입 정의
 */

export type DiffOperation = 'insert' | 'delete' | 'equal';

export interface DiffHunk {
  operation: DiffOperation;
  text: string;
  lineStart: number;
  lineEnd: number;
}

export interface FileDiff {
  filePath: string;
  originalContent: string;
  newContent: string;
  hunks: DiffHunk[];
  insertions: number;
  deletions: number;
}

export interface DiffSession {
  id: string;
  fileDiffs: FileDiff[];
  acceptedHunks: Set<string>;
  rejectedHunks: Set<string>;
  createdAt: number;
}
