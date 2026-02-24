import type { DependencyEdge, DependencyGraph as IDependencyGraph } from '@intent-ide/core';
import type { SymbolIndex } from '../parser/SymbolExtractor.js';

export class DependencyGraph {
  private nodes: Set<string> = new Set();
  private edges: DependencyEdge[] = [];

  buildFromSymbols(symbolIndices: SymbolIndex[]): IDependencyGraph {
    this.nodes.clear();
    this.edges = [];

    // Add all files as nodes
    for (const index of symbolIndices) {
      this.nodes.add(index.filePath);
    }

    // Build edges from imports
    for (const index of symbolIndices) {
      for (const imported of index.importedFrom) {
        // Resolve relative imports
        const resolvedPath = this.resolveImport(index.filePath, imported);
        if (resolvedPath && this.nodes.has(resolvedPath)) {
          this.edges.push({
            from: index.filePath,
            to: resolvedPath,
            type: 'import',
          });
        }
      }
    }

    return {
      nodes: [...this.nodes],
      edges: this.edges,
    };
  }

  getDependencies(filePath: string): string[] {
    return this.edges
      .filter((e) => e.from === filePath)
      .map((e) => e.to);
  }

  getDependents(filePath: string): string[] {
    return this.edges
      .filter((e) => e.to === filePath)
      .map((e) => e.from);
  }

  private resolveImport(fromFile: string, importPath: string): string | null {
    if (importPath.startsWith('.')) {
      // Relative import
      const parts = fromFile.split('/');
      parts.pop(); // Remove filename
      const basePath = parts.join('/');
      const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
      for (const ext of extensions) {
        const resolved = `${basePath}/${importPath}${ext}`;
        if (this.nodes.has(resolved)) {
          return resolved;
        }
      }
    }
    return null;
  }
}
