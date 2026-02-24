import type { ParsedSymbol } from './TreeSitterParser.js';

export interface SymbolIndex {
  filePath: string;
  symbols: ParsedSymbol[];
  importedFrom: string[];
  exportedTo: string[];
}

export class SymbolExtractor {
  buildIndex(
    filePath: string,
    symbols: ParsedSymbol[],
    content: string
  ): SymbolIndex {
    const importedFrom = this.extractImports(content);
    const exportedTo: string[] = [];

    return {
      filePath,
      symbols,
      importedFrom,
      exportedTo,
    };
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /^(?:import|from)\s+['"]([^'"]+)['"]/gm;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  findUsages(symbolName: string, content: string): number[] {
    const lines = content.split('\n');
    const usageLines: number[] = [];
    const regex = new RegExp(`\\b${symbolName}\\b`);

    lines.forEach((line, index) => {
      if (regex.test(line)) {
        usageLines.push(index + 1);
      }
    });

    return usageLines;
  }
}
