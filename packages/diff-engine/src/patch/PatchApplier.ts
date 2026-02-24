import type { FileDiff } from '@intent-ide/core';

export class PatchApplier {
  apply(diff: FileDiff): string {
    return diff.newContent;
  }

  applyHunk(original: string, diff: FileDiff, hunkIndex: number): string {
    const hunk = diff.hunks[hunkIndex];
    if (!hunk) {
      return original;
    }

    const lines = original.split('\n');
    if (hunk.operation === 'insert') {
      lines.splice(hunk.lineStart - 1, 0, hunk.text);
    } else if (hunk.operation === 'delete') {
      lines.splice(hunk.lineStart - 1, 1);
    }

    return lines.join('\n');
  }

  revert(diff: FileDiff): string {
    return diff.originalContent;
  }
}
