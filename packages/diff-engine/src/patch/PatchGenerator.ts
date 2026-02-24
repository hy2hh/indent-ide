import type { FileDiff, DiffHunk } from '@intent-ide/core';
import { MyersDiff } from '../algorithm/MyersDiff.js';

export class PatchGenerator {
  private differ = new MyersDiff();

  generate(filePath: string, originalContent: string, newContent: string): FileDiff {
    const hunks = this.differ.compute(originalContent, newContent);
    const { insertions, deletions } = this.countChanges(hunks);

    return {
      filePath,
      originalContent,
      newContent,
      hunks,
      insertions,
      deletions,
    };
  }

  generateMultiple(
    files: Array<{ filePath: string; original: string; modified: string }>
  ): FileDiff[] {
    return files.map(({ filePath, original, modified }) =>
      this.generate(filePath, original, modified)
    );
  }

  private countChanges(hunks: DiffHunk[]): { insertions: number; deletions: number } {
    let insertions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      if (hunk.operation === 'insert') {
        insertions++;
      } else if (hunk.operation === 'delete') {
        deletions++;
      }
    }

    return { insertions, deletions };
  }
}
