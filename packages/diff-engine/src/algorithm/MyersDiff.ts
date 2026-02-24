import type { DiffHunk, DiffOperation } from '@intent-ide/core';

interface Edit {
  operation: DiffOperation;
  text: string;
}

/**
 * Myers Diff Algorithm - O(ND) shortest edit script
 * Reference: "An O(ND) Difference Algorithm and Its Variations" by Eugene Myers
 */
export class MyersDiff {
  compute(original: string, modified: string): DiffHunk[] {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const edits = this.computeEdits(origLines, modLines);
    return this.toHunks(edits);
  }

  private computeEdits(origLines: string[], modLines: string[]): Edit[] {
    const n = origLines.length;
    const m = modLines.length;
    const max = n + m;

    if (max === 0) {
      return [];
    }

    const v: number[] = new Array(2 * max + 1).fill(0);
    const trace: number[][] = [];

    for (let d = 0; d <= max; d++) {
      trace.push([...v]);
      for (let k = -d; k <= d; k += 2) {
        let x: number;
        const ki = k + max;
        if (k === -d || (k !== d && (v[ki - 1] ?? 0) < (v[ki + 1] ?? 0))) {
          x = v[ki + 1] ?? 0;
        } else {
          x = (v[ki - 1] ?? 0) + 1;
        }
        let y = x - k;
        while (x < n && y < m && origLines[x] === modLines[y]) {
          x++;
          y++;
        }
        v[ki] = x;
        if (x >= n && y >= m) {
          return this.backtrack(trace, origLines, modLines, max);
        }
      }
    }
    return [];
  }

  private backtrack(
    trace: number[][],
    origLines: string[],
    modLines: string[],
    max: number
  ): Edit[] {
    const edits: Edit[] = [];
    let x = origLines.length;
    let y = modLines.length;

    for (let d = trace.length - 1; d >= 0; d--) {
      const v = trace[d]!;
      const k = x - y;
      const ki = k + max;

      let prevK: number;
      if (k === -d || (k !== d && (v[ki - 1] ?? 0) < (v[ki + 1] ?? 0))) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }

      const prevX = v[prevK + max] ?? 0;
      const prevY = prevX - prevK;

      while (x > prevX && y > prevY) {
        x--;
        y--;
        edits.unshift({ operation: 'equal', text: origLines[x] ?? '' });
      }

      if (d > 0) {
        if (x === prevX) {
          edits.unshift({ operation: 'insert', text: modLines[prevY] ?? '' });
        } else {
          edits.unshift({ operation: 'delete', text: origLines[prevX] ?? '' });
        }
      }

      x = prevX;
      y = prevY;
    }

    return edits;
  }

  private toHunks(edits: Edit[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let lineNum = 1;

    for (const edit of edits) {
      hunks.push({
        operation: edit.operation,
        text: edit.text,
        lineStart: lineNum,
        lineEnd: lineNum,
      });
      if (edit.operation !== 'insert') {
        lineNum++;
      }
    }

    return hunks;
  }
}
