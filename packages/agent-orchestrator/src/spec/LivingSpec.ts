import { EventEmitter } from 'node:events';
import type {
  LivingSpecData,
  SpecTask,
  SpecUpdateEvent,
  TaskStatus,
} from '@intent-ide/core';

/**
 * Living Spec - 에이전트 간 공유 명세서
 * 양방향 읽기/쓰기 + 변경 추적
 */
export class LivingSpec extends EventEmitter {
  private data: LivingSpecData;

  constructor(initial: LivingSpecData) {
    super();
    this.data = { ...initial };
  }

  static create(sessionId: string, goal: string, context: string): LivingSpec {
    return new LivingSpec({
      id: `spec-${Date.now()}`,
      sessionId,
      goal,
      context,
      tasks: [],
      constraints: [],
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });
  }

  // ===== Read =====

  getData(): LivingSpecData {
    return { ...this.data };
  }

  getTask(taskId: string): SpecTask | undefined {
    return this.data.tasks.find((t) => t.id === taskId);
  }

  getPendingTasks(): SpecTask[] {
    return this.data.tasks.filter((t) => t.status === 'pending');
  }

  getInProgressTasks(): SpecTask[] {
    return this.data.tasks.filter((t) => t.status === 'in_progress');
  }

  isApproved(): boolean {
    return this.data.status === 'approved' || this.data.status === 'in_progress';
  }

  isComplete(): boolean {
    return (
      this.data.tasks.length > 0 &&
      this.data.tasks.every((t) => t.status === 'completed' || t.status === 'skipped')
    );
  }

  // ===== Write =====

  addTask(task: SpecTask, updatedBy: string): void {
    this.update(
      () => this.data.tasks.push(task),
      { taskId: task.id, field: 'tasks', previousValue: null, newValue: task, updatedBy }
    );
  }

  updateTaskStatus(taskId: string, status: TaskStatus, updatedBy: string): void {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) {
      return;
    }
    const prev = task.status;
    this.update(
      () => {
        task.status = status;
        if (status === 'in_progress') {
          task.startedAt = Date.now();
        } else if (status === 'completed') {
          task.completedAt = Date.now();
        }
      },
      { taskId, field: 'status', previousValue: prev, newValue: status, updatedBy }
    );
  }

  addDiscovery(taskId: string, discovery: string, updatedBy: string): void {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) {
      return;
    }
    this.update(
      () => task.discoveries.push(discovery),
      { taskId, field: 'discoveries', previousValue: null, newValue: discovery, updatedBy }
    );
  }

  addFeedback(taskId: string, feedback: string, updatedBy: string): void {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) {
      return;
    }
    this.update(
      () => task.feedback.push(feedback),
      { taskId, field: 'feedback', previousValue: null, newValue: feedback, updatedBy }
    );
  }

  setTaskFiles(taskId: string, files: string[], updatedBy: string): void {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) {
      return;
    }
    const prev = task.files;
    this.update(
      () => { task.files = files; },
      { taskId, field: 'files', previousValue: prev, newValue: files, updatedBy }
    );
  }

  approve(updatedBy: string): void {
    this.update(
      () => {
        this.data.status = 'approved';
        this.data.approvedAt = Date.now();
      },
      { field: 'status', previousValue: 'draft', newValue: 'approved', updatedBy }
    );
  }

  startExecution(updatedBy: string): void {
    this.update(
      () => { this.data.status = 'in_progress'; },
      { field: 'status', previousValue: 'approved', newValue: 'in_progress', updatedBy }
    );
  }

  complete(updatedBy: string): void {
    this.update(
      () => { this.data.status = 'completed'; },
      { field: 'status', previousValue: 'in_progress', newValue: 'completed', updatedBy }
    );
  }

  fail(updatedBy: string): void {
    this.update(
      () => { this.data.status = 'failed'; },
      { field: 'status', previousValue: this.data.status, newValue: 'failed', updatedBy }
    );
  }

  private update(
    mutate: () => void,
    eventData: Omit<SpecUpdateEvent, 'specId' | 'timestamp'>
  ): void {
    mutate();
    this.data.updatedAt = Date.now();
    this.data.version++;

    const event: SpecUpdateEvent = {
      specId: this.data.id,
      timestamp: Date.now(),
      ...eventData,
    };

    this.emit('updated', event);
    this.emit('spec:updated', this.data);
  }
}
