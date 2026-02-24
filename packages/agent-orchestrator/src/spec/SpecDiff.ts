import type { LivingSpecData, SpecUpdateEvent } from '@intent-ide/core';

export interface SpecChange {
  field: string;
  taskId?: string;
  before: unknown;
  after: unknown;
  timestamp: number;
  updatedBy: string;
}

/**
 * Living Spec 변경 추적
 */
export class SpecDiff {
  private history: SpecChange[] = [];

  recordChange(event: SpecUpdateEvent): void {
    this.history.push({
      field: event.field,
      ...(event.taskId !== undefined ? { taskId: event.taskId } : {}),
      before: event.previousValue,
      after: event.newValue,
      timestamp: event.timestamp,
      updatedBy: event.updatedBy,
    });
  }

  getHistory(): SpecChange[] {
    return [...this.history];
  }

  getTaskHistory(taskId: string): SpecChange[] {
    return this.history.filter((c) => c.taskId === taskId);
  }

  diffSpecs(before: LivingSpecData, after: LivingSpecData): SpecChange[] {
    const changes: SpecChange[] = [];
    const now = Date.now();

    if (before.status !== after.status) {
      changes.push({
        field: 'status',
        before: before.status,
        after: after.status,
        timestamp: now,
        updatedBy: 'system',
      });
    }

    // Check task changes
    for (const afterTask of after.tasks) {
      const beforeTask = before.tasks.find((t) => t.id === afterTask.id);
      if (!beforeTask) {
        changes.push({
          field: 'tasks',
          taskId: afterTask.id,
          before: null,
          after: afterTask,
          timestamp: now,
          updatedBy: 'system',
        });
      } else if (beforeTask.status !== afterTask.status) {
        changes.push({
          field: 'status',
          taskId: afterTask.id,
          before: beforeTask.status,
          after: afterTask.status,
          timestamp: now,
          updatedBy: 'system',
        });
      }
    }

    return changes;
  }

  clear(): void {
    this.history = [];
  }
}
