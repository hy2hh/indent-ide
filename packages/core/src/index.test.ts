import { describe, it, expect } from 'vitest';
import { TOKEN_BUDGETS, CONTEXT_COMPACTION, PROCESS_LIMITS } from './constants/tokens.js';

describe('Token constants', () => {
  it('should have coordinator budget', () => {
    expect(TOKEN_BUDGETS.COORDINATOR).toBeGreaterThan(0);
  });

  it('should have MAX_HOT_RESULTS', () => {
    expect(CONTEXT_COMPACTION.MAX_HOT_RESULTS).toBeGreaterThan(0);
  });

  it('should have max concurrent CLI', () => {
    expect(PROCESS_LIMITS.MAX_CONCURRENT_CLI).toBeGreaterThan(0);
  });
});
