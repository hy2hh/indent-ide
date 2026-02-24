export interface ResolvedFile {
  path: string;
  relevanceScore: number;
  reason: string;
}

export class FileResolver {
  resolve(
    intent: string,
    availableFiles: string[],
    contextFiles?: string[]
  ): ResolvedFile[] {
    const resolved: ResolvedFile[] = [];
    const filePatterns = this.extractFilePatterns(intent);

    for (const file of availableFiles) {
      const score = this.scoreFile(file, filePatterns, intent);
      if (score > 0) {
        resolved.push({
          path: file,
          relevanceScore: score,
          reason: this.explainScore(file, filePatterns),
        });
      }
    }

    if (contextFiles) {
      for (const ctxFile of contextFiles) {
        const existing = resolved.find((r) => r.path === ctxFile);
        if (existing) {
          existing.relevanceScore = Math.min(existing.relevanceScore + 0.3, 1.0);
        } else {
          resolved.push({
            path: ctxFile,
            relevanceScore: 0.3,
            reason: '현재 컨텍스트 파일',
          });
        }
      }
    }

    return resolved.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private extractFilePatterns(intent: string): string[] {
    const patterns: string[] = [];
    const componentMatches = intent.match(/[A-Z][a-zA-Z]+/g);
    if (componentMatches) {
      patterns.push(...componentMatches);
    }
    const fileMatches = intent.match(/[\w-]+\.\w+/g);
    if (fileMatches) {
      patterns.push(...fileMatches);
    }
    return patterns;
  }

  private scoreFile(file: string, patterns: string[], intent: string): number {
    let score = 0;
    const fileName = file.split('/').pop() ?? '';

    for (const pattern of patterns) {
      if (fileName.toLowerCase().includes(pattern.toLowerCase())) {
        score += 0.5;
      }
    }

    if (intent.match(/test|테스트/i) && fileName.includes('.test.')) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  private explainScore(file: string, patterns: string[]): string {
    const fileName = file.split('/').pop() ?? '';
    const matched = patterns.filter((p) =>
      fileName.toLowerCase().includes(p.toLowerCase())
    );
    if (matched.length > 0) {
      return `파일명이 "${matched.join(', ')}"와 일치`;
    }
    return '관련 파일로 추정';
  }
}
