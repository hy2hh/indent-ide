import type { FileDiff } from '@intent-ide/core';
import { PatchApplier } from '../patch/PatchApplier.js';

export interface MergeResult {
  filePath: string;
  content: string;
  hasConflicts: boolean;
}

export class MultiFileMerge {
  private applier = new PatchApplier();

  mergeAll(diffs: FileDiff[]): MergeResult[] {
    return diffs.map((diff) => ({
      filePath: diff.filePath,
      content: this.applier.apply(diff),
      hasConflicts: false,
    }));
  }

  mergeSingle(diff: FileDiff): MergeResult {
    return {
      filePath: diff.filePath,
      content: this.applier.apply(diff),
      hasConflicts: false,
    };
  }
}
