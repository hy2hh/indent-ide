import { TOKEN_BUDGETS } from '@intent-ide/core';
import type { SearchResult } from '@intent-ide/core';

export class TokenBudget {
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  fitToBudget(results: SearchResult[], budget: number): SearchResult[] {
    const selected: SearchResult[] = [];
    let total = 0;

    for (const result of results) {
      if (total + result.tokenCount > budget) {
        break;
      }
      selected.push(result);
      total += result.tokenCount;
    }

    return selected;
  }

  calculateRemainingBudget(used: number, role: 'coordinator' | 'implementor' | 'verifier'): number {
    const budgets = {
      coordinator: TOKEN_BUDGETS.COORDINATOR,
      implementor: TOKEN_BUDGETS.IMPLEMENTOR,
      verifier: TOKEN_BUDGETS.VERIFIER,
    };
    return Math.max(0, budgets[role] - used);
  }

  formatBudgetStatus(used: number, budget: number): string {
    const percentage = Math.round((used / budget) * 100);
    return `${used.toLocaleString()} / ${budget.toLocaleString()} tokens (${percentage}%)`;
  }
}
