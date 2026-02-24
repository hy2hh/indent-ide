/**
 * 에디터 관련 타입 정의
 */

export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  isDirty: boolean;
  isActive: boolean;
  content?: string;
  language?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  selectedText: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

export interface EditorDecoration {
  id: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  type: 'add' | 'remove' | 'modify' | 'highlight';
  hoverMessage?: string;
}
