export type IntentType =
  | 'simple_edit'
  | 'complex_edit'
  | 'refactor'
  | 'new_feature'
  | 'bug_fix'
  | 'question'
  | 'unknown';

export interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  rawText: string;
  keywords: string[];
}

const INTENT_PATTERNS: Array<{ pattern: RegExp; type: IntentType; weight: number }> = [
  { pattern: /추가|add|implement|create|만들/i, type: 'new_feature', weight: 0.6 },
  { pattern: /수정|fix|bug|오류|에러|error|broken/i, type: 'bug_fix', weight: 0.7 },
  { pattern: /리팩토링|refactor|개선|improve|정리|cleanup/i, type: 'refactor', weight: 0.6 },
  { pattern: /변경|change|update|수정|edit|modify/i, type: 'simple_edit', weight: 0.4 },
  { pattern: /무엇|what|어떻게|how|왜|why|설명|explain|알려줘/i, type: 'question', weight: 0.8 },
];

export class IntentClassifier {
  classify(text: string): ClassifiedIntent {
    const keywords: string[] = [];
    let bestMatch: { type: IntentType; confidence: number } = {
      type: 'unknown',
      confidence: 0,
    };

    for (const { pattern, type, weight } of INTENT_PATTERNS) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        keywords.push(...matches);
        const confidence = Math.min(matches.length * weight, 1.0);
        if (confidence > bestMatch.confidence) {
          bestMatch = { type, confidence };
        }
      }
    }

    // Heuristic: long requests with new feature keywords = complex
    if (bestMatch.type === 'new_feature') {
      const wordCount = text.split(/\s+/).length;
      if (wordCount > 12) {
        bestMatch = { ...bestMatch, type: 'complex_edit' };
      }
    }

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      rawText: text,
      keywords: [...new Set(keywords)],
    };
  }
}
