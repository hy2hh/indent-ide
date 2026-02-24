import type { DependencyGraph } from '@intent-ide/core';

export interface RankedNode {
  filePath: string;
  rank: number;
  inDegree: number;
  outDegree: number;
}

/**
 * PageRank 기반 파일 중요도 계산
 * 많이 import되는 파일일수록 높은 순위
 */
export class GraphRanker {
  private dampingFactor = 0.85;
  private iterations = 20;
  private tolerance = 1e-6;

  rank(graph: DependencyGraph): RankedNode[] {
    if (graph.nodes.length === 0) {
      return [];
    }

    const n = graph.nodes.length;
    const nodeIndex = new Map<string, number>();
    graph.nodes.forEach((node, i) => nodeIndex.set(node, i));

    // Build adjacency
    const inLinks: number[][] = Array.from({ length: n }, () => []);
    const outDegrees = new Array<number>(n).fill(0);

    for (const edge of graph.edges) {
      const from = nodeIndex.get(edge.from);
      const to = nodeIndex.get(edge.to);
      if (from !== undefined && to !== undefined) {
        inLinks[to]?.push(from);
        outDegrees[from] = (outDegrees[from] ?? 0) + 1;
      }
    }

    // Initialize ranks
    let ranks = new Array<number>(n).fill(1 / n);

    // Power iteration
    for (let iter = 0; iter < this.iterations; iter++) {
      const newRanks = new Array<number>(n).fill(0);
      let diff = 0;

      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (const from of inLinks[i] ?? []) {
          const outDeg = outDegrees[from] ?? 1;
          sum += (ranks[from] ?? 0) / outDeg;
        }
        newRanks[i] = (1 - this.dampingFactor) / n + this.dampingFactor * sum;
        diff += Math.abs((newRanks[i] ?? 0) - (ranks[i] ?? 0));
      }

      ranks = newRanks;
      if (diff < this.tolerance) {
        break;
      }
    }

    return graph.nodes.map((node, i) => ({
      filePath: node,
      rank: ranks[i] ?? 0,
      inDegree: inLinks[i]?.length ?? 0,
      outDegree: outDegrees[i] ?? 0,
    })).sort((a, b) => b.rank - a.rank);
  }
}
