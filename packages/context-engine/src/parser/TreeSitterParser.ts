import { readFile } from 'node:fs/promises';
import type { CodeChunk } from '@intent-ide/core';

export interface ParsedFile {
  filePath: string;
  language: string;
  chunks: CodeChunk[];
  symbols: ParsedSymbol[];
}

export interface ParsedSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'export';
  startLine: number;
  endLine: number;
  isExported: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.rb': 'ruby',
  '.md': 'markdown',
  '.json': 'json',
};

export class TreeSitterParser {
  private chunkSize: number;

  constructor(chunkSize = 50) {
    this.chunkSize = chunkSize;
  }

  async parseFile(filePath: string, extension: string): Promise<ParsedFile> {
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      return {
        filePath,
        language: 'unknown',
        chunks: [],
        symbols: [],
      };
    }

    const language = LANGUAGE_MAP[extension] ?? 'text';
    const symbols = this.extractSymbols(content, language);
    const chunks = this.chunkContent(filePath, content, language, symbols);

    return { filePath, language, chunks, symbols };
  }

  private extractSymbols(content: string, language: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'tsx' || language === 'javascript') {
      this.extractJsSymbols(lines, symbols);
    } else if (language === 'python') {
      this.extractPythonSymbols(lines, symbols);
    }

    return symbols;
  }

  private extractJsSymbols(lines: string[], symbols: ParsedSymbol[]): void {
    const patterns = [
      {
        regex: /^export\s+(default\s+)?function\s+(\w+)/,
        type: 'function' as const,
        exported: true,
      },
      {
        regex: /^function\s+(\w+)/,
        type: 'function' as const,
        exported: false,
      },
      {
        regex: /^export\s+(default\s+)?class\s+(\w+)/,
        type: 'class' as const,
        exported: true,
      },
      {
        regex: /^class\s+(\w+)/,
        type: 'class' as const,
        exported: false,
      },
      {
        regex: /^export\s+(type|interface)\s+(\w+)/,
        type: 'interface' as const,
        exported: true,
      },
      {
        regex: /^export\s+const\s+(\w+)/,
        type: 'variable' as const,
        exported: true,
      },
      {
        regex: /^const\s+(\w+)\s*=/,
        type: 'variable' as const,
        exported: false,
      },
    ];

    lines.forEach((line, index) => {
      for (const { regex, type, exported } of patterns) {
        const match = line.match(regex);
        if (match) {
          const name = match[2] ?? match[1] ?? 'unknown';
          symbols.push({
            name,
            type,
            startLine: index + 1,
            endLine: index + 1,
            isExported: exported,
          });
        }
      }
    });
  }

  private extractPythonSymbols(lines: string[], symbols: ParsedSymbol[]): void {
    lines.forEach((line, index) => {
      const fnMatch = line.match(/^def\s+(\w+)/);
      const classMatch = line.match(/^class\s+(\w+)/);

      if (fnMatch) {
        symbols.push({
          name: fnMatch[1] ?? 'unknown',
          type: 'function',
          startLine: index + 1,
          endLine: index + 1,
          isExported: !fnMatch[1]?.startsWith('_'),
        });
      } else if (classMatch) {
        symbols.push({
          name: classMatch[1] ?? 'unknown',
          type: 'class',
          startLine: index + 1,
          endLine: index + 1,
          isExported: true,
        });
      }
    });
  }

  private chunkContent(
    filePath: string,
    content: string,
    language: string,
    symbols: ParsedSymbol[]
  ): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    if (symbols.length === 0) {
      // Fall back to line-based chunking
      for (let i = 0; i < lines.length; i += this.chunkSize) {
        const chunkLines = lines.slice(i, i + this.chunkSize);
        chunks.push({
          id: `${filePath}:${i + 1}`,
          filePath,
          content: chunkLines.join('\n'),
          startLine: i + 1,
          endLine: Math.min(i + this.chunkSize, lines.length),
          symbols: [],
          language,
          chunkType: 'block',
        });
      }
      return chunks;
    }

    // Symbol-based chunking
    let lastEnd = 0;
    for (let si = 0; si < symbols.length; si++) {
      const symbol = symbols[si];
      if (!symbol) {
        continue;
      }
      const nextSymbol = symbols[si + 1];
      const endLine = nextSymbol ? nextSymbol.startLine - 2 : lines.length;

      const chunkLines = lines.slice(symbol.startLine - 1, endLine);
      chunks.push({
        id: `${filePath}:${symbol.startLine}:${symbol.name}`,
        filePath,
        content: chunkLines.join('\n'),
        startLine: symbol.startLine,
        endLine,
        symbols: [symbol.name],
        language,
        chunkType: symbol.type === 'function' ? 'function' : 'class',
      });
      lastEnd = endLine;
    }

    // Add any leading content before first symbol
    if (symbols[0] && symbols[0].startLine > 1) {
      const headerLines = lines.slice(0, symbols[0].startLine - 1);
      if (headerLines.join('').trim()) {
        chunks.unshift({
          id: `${filePath}:1:header`,
          filePath,
          content: headerLines.join('\n'),
          startLine: 1,
          endLine: symbols[0].startLine - 1,
          symbols: [],
          language,
          chunkType: 'module',
        });
      }
    }

    return chunks;
  }
}
